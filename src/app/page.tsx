"use client";

import { useState } from "react";
import { SearchForm } from "@/components/SearchForm";
import { ResultsCards } from "@/components/ResultsCards";
import { ResultsTable } from "@/components/ResultsTable";
import { DiscoverResponse, SearchRequest } from "@/types";

export default function Home() {
  const [results, setResults] = useState<DiscoverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);

  async function handleSearch(request: SearchRequest) {
    setLoading(true);
    setError(null);
    setResults(null);
    setStatusMessage("Starting pipeline...");
    setProgress(0);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Server error (${response.status})`);
        }
        setResults(data);
        setStatusMessage("");
        setLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const chunk of lines) {
          const dataLine = chunk.trim();
          if (!dataLine.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(dataLine.slice(6));

            if (event.type === "status") {
              setStatusMessage(event.message || "Processing...");
              if (event.progress) setProgress(event.progress);
            } else if (event.type === "result") {
              setResults(event.data);
              setStatusMessage("");
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes("JSON")) {
              throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setStatusMessage("");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }

  function exportCSV() {
    if (!results || results.results.length === 0) return;

    const headers = [
      "Name", "Role", "Organization", "Official Site",
      "Profile Links", "Contact Links", "Confidence", "Next Action", "Evidence",
    ];

    const rows = results.results.map((r) => [
      r.name, r.role, r.organization, r.official_site,
      (r.profile_links || []).join(" | "),
      (r.contact_links || []).join(" | "),
      String(r.confidence), r.next_best_action,
      (r.evidence || []).join(" | "),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lead-finder-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Lead Finder</h1>
        <p className="text-gray-600 mt-1">
          AI-powered outreach research. Enter names or a category to discover people and their best contact paths.
        </p>
      </div>

      <SearchForm onSubmit={handleSearch} loading={loading} />

      {loading && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <p className="text-gray-700">{statusMessage || "Processing..."}</p>
          </div>
          {progress > 0 && (
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">
            This may take 30-90 seconds depending on how many people are being researched.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Results for &ldquo;{results.query}&rdquo;
              </h2>
              <p className="text-sm text-gray-500">
                {results.results.length} people found &middot;{" "}
                {results.metadata.totalSearches} searches &middot;{" "}
                {results.metadata.totalCrawled} pages crawled &middot;{" "}
                {(results.metadata.processingTimeMs / 1000).toFixed(1)}s
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`px-3 py-1.5 text-sm ${
                    viewMode === "cards"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 text-sm ${
                    viewMode === "table"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Table
                </button>
              </div>
              <button
                onClick={exportCSV}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Export CSV
              </button>
            </div>
          </div>

          {results.results.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                No results found. Try broadening your search or using different terms.
              </p>
            </div>
          ) : viewMode === "cards" ? (
            <ResultsCards results={results.results} />
          ) : (
            <ResultsTable results={results.results} />
          )}
        </div>
      )}
    </main>
  );
}
