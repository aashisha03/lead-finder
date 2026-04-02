/**
 * Vercel KV helpers for outreach tracking.
 * Data layout:
 *   outreach_entries  →  OutreachEntry[]   (newest first, capped at 1000)
 *   projects          →  string[]          (list of project names)
 */

import { kv } from "@vercel/kv";
import { OutreachEntry } from "@/types";

const ENTRIES_KEY = "outreach_entries";
const PROJECTS_KEY = "projects";

export async function getOutreachEntries(): Promise<OutreachEntry[]> {
  const entries = await kv.get<OutreachEntry[]>(ENTRIES_KEY);
  return entries ?? [];
}

export async function addOutreachEntry(entry: OutreachEntry): Promise<void> {
  const entries = await getOutreachEntries();
  entries.unshift(entry); // newest first
  await kv.set(ENTRIES_KEY, entries.slice(0, 1000));
}

export async function getProjects(): Promise<string[]> {
  const projects = await kv.get<string[]>(PROJECTS_KEY);
  return projects ?? [];
}

export async function ensureProject(name: string): Promise<void> {
  const projects = await getProjects();
  if (name && !projects.includes(name)) {
    projects.push(name);
    await kv.set(PROJECTS_KEY, projects);
  }
}
