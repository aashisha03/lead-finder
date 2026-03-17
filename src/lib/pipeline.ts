/**
 * Lead Discovery Pipeline
 *
 * Orchestrates the full flow:
 *   1. Query expansion (Prompt A)
 *   2. Web search (OSV Search API)
 *   3. Page crawling (OSV Crawl API)
 *   4. Classification (Prompt B)
 *   5. Ranking (Prompt C)
 */

import { SearchRequest, PersonResult, DiscoverResponse, ClassifiedResult, CrawledPage } from "@/types";
import { searchWeb, searchMultiple } from "./osv-search";
import { extractPage, extractMultiple } from "./osv-crawl";
import { callClaude, parseJSON } from "./llm";
import {
  buildQueryExpansionPrompt,
  buildNameExtractionPrompt,
  buildClassificationPrompt,
  buildRankingPrompt,
} from "./prompts";

type StatusCallback = (stage: string, message: string, progress?: number) => void;

interface ExpandedQuery {
  inputType: "category" | "names";
  discoveryQueries: string[];
  people: Array<{
    name: string;
    searchQueries: Array<{ query: string; intentType: string }>;
  }>;
}

export async function runPipeline(
  request: SearchRequest,
  onStatus?: StatusCallback
): Promise<DiscoverResponse> {
  const startTime = Date.now();
  let totalSearches = 0;
  let totalCrawled = 0;
  let totalClassified = 0;

  const maxPeople = request.maxPeople || 10;
  const targetType = request.targetType || "person";
  const region = request.region || "US";
  const maxResultsPerQuery = parseInt(process.env.MAX_RESULTS_PER_QUERY || "5");

  // Step 1: Query Expansion (Prompt A)
  onStatus?.("expanding", "Expanding your query into search intents...", 10);

  const expansionPrompt = buildQueryExpansionPrompt(
    request.query,
    targetType,
    region,
    maxPeople
  );
  const expansionRaw = await callClaude(expansionPrompt);
  let expanded: ExpandedQuery;
  try {
    expanded = parseJSON<ExpandedQuery>(expansionRaw);
  } catch (e) {
    throw new Error(`Failed to parse query expansion response: ${(e as Error).message}`);
  }

  // Step 1b: Discovery (if category query)
  if (expanded.inputType === "category" && expanded.discoveryQueries.length > 0 && expanded.people.length === 0) {
    onStatus?.("searching", "Running discovery searches to find people...", 20);

    const discoveryResults = await searchMultiple(expanded.discoveryQueries);
    totalSearches += expanded.discoveryQueries.length;

    let combinedSnippets = "";
    discoveryResults.forEach((response, query) => {
      combinedSnippets += `\nQuery: ${query}\n`;
      response.results.slice(0, 8).forEach((r) => {
        combinedSnippets += `- ${r.title}: ${r.content}\n  URL: ${r.url}\n`;
      });
    });

    onStatus?.("expanding", "Extracting people from discovery results...", 30);

    const nameExtractionPrompt = buildNameExtractionPrompt(
      request.query,
      targetType,
      combinedSnippets,
      maxPeople
    );
    const namesRaw = await callClaude(nameExtractionPrompt);
    try {
      const namesResult = parseJSON<{ people: ExpandedQuery["people"] }>(namesRaw);
      expanded.people = namesResult.people.slice(0, maxPeople);
    } catch (e) {
      throw new Error(`Failed to parse name extraction response: ${(e as Error).message}`);
    }
  }

  if (expanded.people.length === 0) {
    return {
      query: request.query,
      results: [],
      metadata: {
        totalSearches,
        totalCrawled,
        totalClassified,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  // Step 2: Search for each person
  onStatus?.("searching", `Searching for ${expanded.people.length} people...`, 40);

  const allPersonResults: PersonResult[] = [];

  for (let pIdx = 0; pIdx < expanded.people.length; pIdx++) {
    const person = expanded.people[pIdx];
    const progress = 40 + (pIdx / expanded.people.length) * 40;
    onStatus?.(
      "searching",
      `Searching for ${person.name} (${pIdx + 1}/${expanded.people.length})...`,
      progress
    );

    const queries = person.searchQueries.slice(0, 4).map((sq) => sq.query);
    const searchResults = await searchMultiple(queries);
    totalSearches += queries.length;

    const urlsToVisit = new Map<string, { url: string; title: string; snippet: string }>();
    searchResults.forEach((response) => {
      response.results.slice(0, maxResultsPerQuery).forEach((r) => {
        if (!urlsToVisit.has(r.url)) {
          urlsToVisit.set(r.url, {
            url: r.url,
            title: r.title,
            snippet: r.content,
          });
        }
      });
    });

    // Step 3: Crawl top pages
    const urlsList = Array.from(urlsToVisit.values()).slice(0, 8);
    onStatus?.("crawling", `Crawling ${urlsList.length} pages for ${person.name}...`, progress + 5);

    const crawledPages = await extractMultiple(
      urlsList.map((u) => u.url),
      { format: "text", strategy: "fast" }
    );
    totalCrawled += crawledPages.length;

    const pagesForClassification = urlsList.map((urlInfo) => {
      const crawled = crawledPages.find((c) => c.url === urlInfo.url);
      return {
        url: urlInfo.url,
        title: crawled?.title || urlInfo.title || "",
        snippet: urlInfo.snippet || "",
        content: crawled?.contents || urlInfo.snippet || "",
      };
    });

    if (pagesForClassification.length === 0) continue;

    // Step 4: Classify results (Prompt B)
    onStatus?.("classifying", `Classifying results for ${person.name}...`, progress + 10);

    const classificationPrompt = buildClassificationPrompt(person.name, pagesForClassification);
    const classificationRaw = await callClaude(classificationPrompt);
    let classifications: { classifications: ClassifiedResult[] };
    try {
      classifications = parseJSON<{ classifications: ClassifiedResult[] }>(classificationRaw);
    } catch (e) {
      console.error(`Classification parse error for ${person.name}:`, e);
      continue;
    }
    totalClassified += classifications.classifications.length;

    let validResults = classifications.classifications.filter((c) => c.isAboutPerson);
    if (request.strictMode) {
      validResults = validResults.filter(
        (c) => c.outreachValue === "high" || c.outreachValue === "medium"
      );
    }

    if (validResults.length === 0) continue;

    // Step 5: Rank results (Prompt C)
    onStatus?.("ranking", `Ranking results for ${person.name}...`, progress + 15);

    const rankingPrompt = buildRankingPrompt(
      person.name,
      JSON.stringify(validResults, null, 2)
    );
    const rankingRaw = await callClaude(rankingPrompt);
    let ranked: PersonResult;
    try {
      ranked = parseJSON<PersonResult>(rankingRaw);
      ranked.all_links = validResults.map((c) => ({
        url: c.url,
        title: c.title || "",
        sourceType: c.sourceType,
        outreachValue: c.outreachValue,
        reason: c.evidence,
      }));
      allPersonResults.push(ranked);
    } catch (e) {
      console.error(`Ranking parse error for ${person.name}:`, e);
    }
  }

  onStatus?.("done", "Pipeline complete!", 100);

  return {
    query: request.query,
    results: allPersonResults,
    metadata: {
      totalSearches,
      totalCrawled,
      totalClassified,
      processingTimeMs: Date.now() - startTime,
    },
  };
}
