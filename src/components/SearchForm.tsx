"use client";

import { useState } from "react";
import { SearchRequest } from "@/types";

interface SearchFormProps {
  onSubmit: (request: SearchRequest) => void;
  loading: boolean;
}

export function SearchForm({ onSubmit, loading }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [targetType, setTargetType] = useState("pastor");
  const [region, setRegion] = useState("US");
  const [maxPeople, setMaxPeople] = useState(5);
  const [strictMode, setStrictMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    onSubmit({
      query: query.trim(),
      targetType,
      region,
      maxPeople,
      strictMode,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      {/* Main Query Input */}
      <div className="mb-4">
        <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
          Search Query
        </label>
        <textarea
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={'Enter names (e.g., "John Piper, T.D. Jakes, Joel Osteen") or a category (e.g., "top 10 pastors in the US")'}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
        />
      </div>

      {/* Quick Options Row */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="targetType" className="block text-sm font-medium text-gray-700 mb-1">
            Target Type
          </label>
          <select
            id="targetType"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="pastor">Pastor</option>
            <option value="author">Author</option>
            <option value="investor">Investor</option>
            <option value="podcast host">Podcast Host</option>
            <option value="speaker">Speaker</option>
            <option value="entrepreneur">Entrepreneur</option>
            <option value="nonprofit leader">Nonprofit Leader</option>
            <option value="person">General Person</option>
          </select>
        </div>

        <div className="flex-1 min-w-[120px]">
          <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
            Region
          </label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="global">Global</option>
          </select>
        </div>

        <div className="w-[120px]">
          <label htmlFor="maxPeople" className="block text-sm font-medium text-gray-700 mb-1">
            Max People
          </label>
          <input
            id="maxPeople"
            type="number"
            min={1}
            max={25}
            value={maxPeople}
            onChange={(e) => setMaxPeople(parseInt(e.target.value) || 5)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Advanced Options */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? "Hide" : "Show"} advanced options
        </button>

        {showAdvanced && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(e) => setStrictMode(e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Strict Mode — reject weak matches and low-confidence results
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Searching..." : "Find Leads"}
      </button>
    </form>
  );
}
