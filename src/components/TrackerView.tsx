"use client";

import { useState, useEffect, useCallback } from "react";
import { OutreachEntry } from "@/types";

interface TrackerViewProps {
  refreshKey?: number;      // increment to trigger a refresh
  initialProject?: string;  // pre-select a project filter on mount
}

export function TrackerView({ refreshKey, initialProject }: TrackerViewProps) {
  const [entries, setEntries] = useState<OutreachEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>(initialProject || "all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outreach");
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to load");
      }
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const allProjects = [...new Set(entries.map((e) => e.project))].filter(Boolean);
  const filtered =
    filterProject === "all"
      ? entries
      : entries.filter((e) => e.project === filterProject);

  if (loading) {
    return (
      <div className="mt-8 flex items-center gap-2 text-gray-500">
        <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
        Loading tracker…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Tracker unavailable</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-sm text-gray-600 mt-2">
          Make sure Vercel KV is connected to this project in your Vercel dashboard
          (Storage → KV → Connect to project).
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Outreach Tracker</h2>
          <p className="text-sm text-gray-500">
            {entries.length} total · {entries.filter((e) => e.status === "sent").length} sent ·{" "}
            {entries.filter((e) => e.status === "logged").length} logged manually
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All projects</option>
            {allProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            onClick={load}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">
            {entries.length === 0
              ? 'No outreach logged yet. Search for leads and use "Log Outreach" to start tracking.'
              : "No entries match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Project</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Person</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Subject</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <>
                  <tr
                    key={entry.id}
                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                    onClick={() =>
                      setExpandedId(expandedId === entry.id ? null : entry.id)
                    }
                  >
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(entry.sentAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {entry.project}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {entry.personName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{entry.email}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                      {entry.subject}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={entry.status} />
                    </td>
                  </tr>
                  {expandedId === entry.id && (
                    <tr key={`${entry.id}-exp`} className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={6} className="px-6 py-4">
                        <p className="text-xs font-medium text-gray-500 mb-1">
                          Message body
                        </p>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {entry.body}
                        </pre>
                        {entry.errorMessage && (
                          <p className="mt-2 text-xs text-red-600">
                            Error: {entry.errorMessage}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: OutreachEntry["status"] }) {
  const styles = {
    sent: "bg-green-100 text-green-700",
    logged: "bg-gray-100 text-gray-600",
    failed: "bg-red-100 text-red-700",
  };
  const labels = { sent: "✓ Sent", logged: "Logged", failed: "✗ Failed" };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
