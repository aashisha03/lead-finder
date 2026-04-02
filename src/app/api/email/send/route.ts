import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Resend not configured. Add RESEND_API_KEY to Vercel environment variables.",
      },
      { status: 503 }
    );
  }

  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "to, subject and body are required" },
        { status: 400 }
      );
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `Lead Finder <${fromAddress}>`,
      to,
      subject,
      text: body,
      html: body
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>"),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
