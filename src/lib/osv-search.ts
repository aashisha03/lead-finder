/**
 * OSV Engineering Web Search API Client
 * Base URL: https://developer.osv.engineering/alpha/web/search
 * Auth: Bearer token
 */

import { OSVSearchResponse } from "@/types";

const SEARCH_BASE_URL = "https://developer.osv.engineering/alpha/web/search";

export interface SearchOptions {
  q: string;
  format?: "json" | "csv" | "rss";
  categories?: string;
  engines?: string;
  language?: string;
  pageno?: number;
  time_range?: "day" | "month" | "year";
  safesearch?: 0 | 1 | 2;
}

export async function searchWeb(options: SearchOptions): Promise<OSVSearchResponse> {
  const apiKey = process.env.OSV_API_KEY;
  if (!apiKey) {
    throw new Error("OSV_API_KEY is not set in environment variables");
  }

  const params = new URLSearchParams();
  params.set("q", options.q);
  params.set("format", options.format || "json");
  if (options.categories) params.set("categories", options.categories);
  if (options.engines) params.set("engines", options.engines);
  if (options.language) params.set("language", options.language);
  if (options.pageno) params.set("pageno", String(options.pageno));
  if (options.time_range) params.set("time_range", options.time_range);
  if (options.safesearch !== undefined) params.set("safesearch", String(options.safesearch));

  const url = `${SEARCH_BASE_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OSV Search API error (${response.status}): ${errorBody}`);
  }

  return response.json();
}

/**
 * Run multiple search queries in parallel with rate limiting
 */
export async function searchMultiple(
  queries: string[],
  options?: Partial<SearchOptions>
): Promise<Map<string, OSVSearchResponse>> {
  const results = new Map<string, OSVSearchResponse>();

  // Process in batches of 3 to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((q) =>
        searchWeb({
          q,
          format: "json",
          categories: "general",
          engines: "google,duckduckgo,bing",
          language: "en-US",
          safesearch: 1,
          ...options,
        })
      )
    );

    batchResults.forEach((result, idx) => {
      if (result.status === "fulfilled") {
        results.set(batch[idx], result.value);
      } else {
        console.error(`Search failed for "${batch[idx]}":`, result.reason);
      }
    });

    // Small delay between batches
    if (i + batchSize < queries.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}
