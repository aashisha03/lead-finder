import { NextRequest, NextResponse } from "next/server";
import { getProjects, ensureProject, getOutreachEntries } from "@/lib/kv";

export async function GET() {
  try {
    const [projects, entries] = await Promise.all([
      getProjects(),
      getOutreachEntries(),
    ]);

    // Count entries per project
    const counts: Record<string, number> = {};
    for (const entry of entries) {
      counts[entry.project] = (counts[entry.project] || 0) + 1;
    }

    const result = projects.map((name) => ({
      name,
      count: counts[name] || 0,
      sent: entries.filter((e) => e.project === name && e.status === "sent").length,
      logged: entries.filter((e) => e.project === name && e.status === "logged").length,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: "KV not configured: " + err.message },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    await ensureProject(name.trim());
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
