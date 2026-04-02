import { NextRequest, NextResponse } from "next/server";
import { getOutreachEntries, addOutreachEntry, ensureProject } from "@/lib/kv";
import { OutreachEntry } from "@/types";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const entries = await getOutreachEntries();
    return NextResponse.json(entries);
  } catch (err: any) {
    return NextResponse.json(
      { error: "KV not configured: " + err.message },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry: OutreachEntry = {
      id: randomUUID(),
      project: body.project || "Uncategorized",
      personName: body.personName || "",
      email: body.email || "",
      subject: body.subject || "",
      body: body.body || "",
      sentAt: new Date().toISOString(),
      status: body.status || "logged",
      errorMessage: body.errorMessage,
      sourceQuery: body.sourceQuery,
    };
    await addOutreachEntry(entry);
    await ensureProject(entry.project);
    return NextResponse.json({ ok: true, id: entry.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
