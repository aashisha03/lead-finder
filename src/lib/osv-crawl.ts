/**
 * OSV Engineering Web Crawling API Client
 * Base URL: https://developer.osv.engineering/web
 * Auth: Bearer token
 *
 * We primarily use the Extract Content (Advanced) endpoint: POST /web/extract
 * since we only need to pull content from individual pages (not full site crawls).
 */

import { CrawledPage } from "@/types";

const CRAWL_BASE_URL = "https://developer.osv.engineering/web";

export interface ExtractOptions {
  url: string;
  format?: "raw" | "markdown" | "mdast" | "text";
  strategy?: "fast" | "auto" | "slow";
  extract?: {
    features?: string[];
  };
  blockAssets?: boolean;
  stealth?: "none" | "mid" | "high";
  retry?: boolean;
  took?: boolean;
}

/**
 * Extract content from a single URL using the advanced endpoint
 */
export async function extractPage(options: ExtractOptions): Promise<CrawledPage> {
  const apiKey = process.env.OSV_API_KEY;
  if (!apiKey) {
    throw new Error("OSV_API_KEY is not set in environment variables");
  }

  const body = {
    url: options.url,
    format: options.format || "text",
    strategy: options.strategy || "fast",
    extract: options.extract || {
      features: ["mainContent", "readability"],
    },
    blockAssets: options.blockAssets ?? true,
    stealth: options.stealth || "none",
    retry: options.retry ?? true,
    took: options.took ?? true,
  };

  try {
    const response = await fetch(`${CRAWL_BASE_URL}/extract`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        url: options.url,
        error: `Crawl API error (${response.status}): ${errorBody}`,
      };
    }

    const data = await response.json();

    return {
      url: data.url || options.url,
      title: extractTitle(data.contents),
      contents: typeof data.contents === "string" ? data.contents : JSON.stringify(data.contents),
      links: data.links || [],
      statusCode: data.code,
    };
  } catch (err: any) {
    return {
      url: options.url,
      error: err.message,
    };
  }
}

/**
 * Simple extract using GET /web/e/{url}
 * Returns plain text content — useful as a fast fallback
 */
export async function extractSimple(targetUrl: string): Promise<CrawledPage> {
  const apiKey = process.env.OSV_API_KEY;
  if (!apiKey) {
    throw new Error("OSV_API_KEY is not set in environment variables");
  }

  try {
    const response = await fetch(
      `${CRAWL_BASE_URL}/e/${encodeURIComponent(targetUrl)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      return {
        url: targetUrl,
        error: `Simple extract error (${response.status})`,
      };
    }

    const text = await response.text();
    return {
      url: targetUrl,
      contents: text,
      statusCode: 200,
    };
  } catch (err: any) {
    return {
      url: targetUrl,
      error: err.message,
    };
  }
}

/**
 * Extract multiple pages in parallel with rate limiting
 */
export async function extractMultiple(
  urls: string[],
  options?: Partial<ExtractOptions>
): Promise<CrawledPage[]> {
  const results: CrawledPage[] = [];
  const batchSize = 3;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((url) =>
        extractPage({
          url,
          ...options,
        })
      )
    );

    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    });

    if (i + batchSize < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}

/** Try to extract a title from page content */
function extractTitle(contents: any): string | undefined {
  if (typeof contents !== "string") return undefined;
  // Look for first heading-like line
  const lines = contents.split("\n").filter((l: string) => l.trim());
  if (lines.length > 0) {
    const first = lines[0].replace(/^#+\s*/, "").trim();
    if (first.length < 200) return first;
  }
  return undefined;
}
