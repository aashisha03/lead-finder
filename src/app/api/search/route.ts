/**
 * POST /api/search
 *
 * Simple search-only endpoint for testing the OSV Search API.
 * Useful for debugging and manual testing.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchWeb } from "@/lib/osv-search";

export async function POST(req: NextRequest) {
  try {
    const { query, categories, engines } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!process.env.OSV_API_KEY) {
      return NextResponse.json(
        { error: "OSV_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const results = await searchWeb({
      q: query,
      format: "json",
      categories: categories || "general",
      engines: engines || "google,duckduckgo,bing",
      language: "en-US",
      safesearch: 1,
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
