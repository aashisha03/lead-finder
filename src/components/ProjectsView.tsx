"use client";

import { useState, useEffect, useCallback } from "react";

interface ProjectStat {
  name: string;
  count: number;
  sent: number;
  logged: number;
}

interface ProjectsViewProps {
  refreshKey?: number;
  onFilterProject?: (name: string) => void; // navigate to tracker with filter
}

export function ProjectsView({ refreshKey, onFilterProject }: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to load");
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  async function createProject() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  const totalSent = projects.reduce((s, p) => s + p.sent, 0);
  const totalLogged = projects.reduce((s, p) => s + p.logged, 0);

  if (loading) {
    return (
      <div className="mt-8 flex items-center gap-2 text-gray-500">
        <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
        Loading projects…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Projects unavailable</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <p className="text-sm text-gray-600 mt-2">
          Make sure Vercel KV is connected to this project in your Vercel dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <p className="text-sm text-gray-500">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {totalSent} sent ·{" "}
            {totalLogged} logged
          </p>
        </div>

        {/* New project inline form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createProject()}
            placeholder="New project name…"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <button
            onClick={createProject}
            disabled={creating || !newName.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "…" : "+ Create"}
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">
            No projects yet. Create one above, or a project will be created automatically
            when you log your first outreach.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div
              key={p.name}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <span className="text-2xl font-bold text-blue-600">{p.count}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">total contacts</p>

              <div className="mt-3 flex gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-gray-600">{p.sent} sent</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                  <span className="text-gray-600">{p.logged} logged</span>
                </div>
              </div>

              {onFilterProject && (
                <button
                  onClick={() => onFilterProject(p.name)}
                  className="mt-3 text-xs text-blue-600 hover:underline"
                >
                  View in tracker →
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
