/**
 * LLM Prompt Templates
 *
 * Three separate prompts as recommended:
 *   Prompt A: Expand user input into search queries
 *   Prompt B: Classify whether a crawled page is relevant to the person
 *   Prompt C: Rank the final links for outreach usefulness
 */

// ============================================================
// PROMPT A — Query Expansion
// ============================================================
export function buildQueryExpansionPrompt(
  userQuery: string,
  targetType: string,
  region: string,
  maxPeople: number
): string {
  return `You are a research assistant helping find real people for outreach.

The user entered: "${userQuery}"
Target type: ${targetType}
Region: ${region}
Max people: ${maxPeople}

Your job is to determine if this is:
(A) A CATEGORY QUERY like "top pastors in the US" — where you need to first find a list of real people
(B) A NAME LIST like "John Piper, T.D. Jakes, Joel Osteen" — where you already have the names

IMPORTANT RULES:
- Do NOT invent or hallucinate names. Only use names you are confident are real, well-known people matching the description.
- If this is a category query, produce a discovery search first (to find lists of real people), then produce person-specific searches.
- For each person, generate search intents covering: official website, organization/church/company profile, Wikipedia, contact/booking page, podcast/interview appearances, conference speaker pages, social profiles.
- Return ONLY valid JSON, no markdown fences.

Return JSON in this exact format:
{
  "inputType": "category" | "names",
  "discoveryQueries": ["query1", "query2"],
  "people": [
    {
      "name": "Full Name",
      "searchQueries": [
        { "query": "Full Name official website", "intentType": "official_website" },
        { "query": "Full Name wikipedia", "intentType": "wikipedia" },
        { "query": "Full Name contact booking", "intentType": "contact" },
        { "query": "Full Name church profile OR organization", "intentType": "organization" },
        { "query": "Full Name podcast interview", "intentType": "interview" },
        { "query": "Full Name conference speaker", "intentType": "conference" },
        { "query": "Full Name LinkedIn", "intentType": "social_profile" }
      ]
    }
  ]
}

If this is a category query with no specific names yet, set "people" to an empty array and fill "discoveryQueries" with 2-3 search queries that would find credible lists of people matching the description. For example, for "top pastors in the US", you might search "largest churches in America pastors list" and "most influential pastors United States".

If names are provided or you know the people well, fill in the "people" array directly and leave "discoveryQueries" empty.`;
}

// ============================================================
// PROMPT A2 — Extract names from discovery results
// ============================================================
export function buildNameExtractionPrompt(
  originalQuery: string,
  targetType: string,
  searchResults: string,
  maxPeople: number
): string {
  return `You are a research assistant. The user asked: "${originalQuery}"
Target type: ${targetType}
Maximum people to return: ${maxPeople}

Below are search results from a discovery search. Extract real, verified names of people matching the query. Only include people you are confident actually exist and match the description.

Search results:
${searchResults}

Return JSON (no markdown fences) with search queries for each discovered person:
{
  "people": [
    {
      "name": "Full Name",
      "searchQueries": [
        { "query": "Full Name official website", "intentType": "official_website" },
        { "query": "Full Name wikipedia", "intentType": "wikipedia" },
        { "query": "Full Name contact booking", "intentType": "contact" },
        { "query": "Full Name ${targetType} profile", "intentType": "organization" },
        { "query": "Full Name podcast interview", "intentType": "interview" },
        { "query": "Full Name conference speaker", "intentType": "conference" }
      ]
    }
  ]
}

Return up to ${maxPeople} people. Only include real people you found in the search results or confidently know match the description.`;
}

// ============================================================
// PROMPT B — Page Classification
// ============================================================
export function buildClassificationPrompt(
  personName: string,
  pages: Array<{ url: string; title: string; snippet: string; content: string }>
): string {
  const pagesText = pages
    .map(
      (p, i) =>
        `--- Page ${i + 1} ---
URL: ${p.url}
Title: ${p.title}
Snippet: ${p.snippet}
Content excerpt (first 800 chars): ${(p.content || "").slice(0, 800)}
---`
    )
    .join("\n\n");

  return `You are a research classifier. For the person "${personName}", classify each of the following web pages.

For each page, determine:
1. Is this page actually about "${personName}" (the specific person, not someone else with a similar name)?
2. Source type: "official" (their own website), "profile" (bio/about page on another site), "contact" (has contact/booking info), "booking" (speaker/event booking), "interview" (podcast, news interview), "secondary" (mentions them but not a primary source), "irrelevant" (not about this person or useless)
3. Does it contain: contact info, staff info, booking info, social profile links?
4. Outreach value: "high" (direct contact path or official presence), "medium" (useful profile or reference), "low" (mentions only), "none" (irrelevant)
5. Brief evidence explaining your classification

Pages to classify:
${pagesText}

Return JSON (no markdown fences) in this exact format:
{
  "classifications": [
    {
      "url": "the page url",
      "title": "page title",
      "isAboutPerson": true,
      "sourceType": "official",
      "hasContactInfo": false,
      "hasStaffInfo": false,
      "hasBookingInfo": false,
      "hasSocialLinks": true,
      "outreachValue": "high",
      "evidence": "This is the official website of [person] with links to their ministry and social profiles."
    }
  ]
}`;
}

// ============================================================
// PROMPT C — Final Ranking
// ============================================================
export function buildRankingPrompt(
  personName: string,
  classifiedResults: string
): string {
  return `You are an outreach research assistant. For "${personName}", review the classified search results below and produce a final ranked summary.

Classified results:
${classifiedResults}

Your job:
1. Determine the person's most likely role and organization based on the evidence.
2. Identify the single best official website URL.
3. Rank the top profile links (max 5) by outreach value.
4. Identify any contact or booking links.
5. Provide a confidence score (0.0 to 1.0) based on how much evidence you found.
6. Suggest the single best next action for someone trying to reach this person.
7. Provide 2-3 brief evidence bullets explaining why these links matter.

IMPORTANT: Do NOT invent information. If you don't have enough evidence, lower the confidence score and say so.

Return JSON (no markdown fences):
{
  "name": "${personName}",
  "role": "Their primary role/title",
  "organization": "Their primary organization",
  "official_site": "best official URL or empty string",
  "profile_links": ["url1", "url2"],
  "contact_links": ["url1"],
  "evidence": ["reason1", "reason2"],
  "confidence": 0.85,
  "next_best_action": "Description of what to do next"
}`;
}
