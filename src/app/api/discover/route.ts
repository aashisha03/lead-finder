/**
 * POST /api/discover
 *
 * Main pipeline endpoint. Uses Server-Sent Events (SSE) to stream
 * progress updates back to the client in real time, then sends the
 * final result. This keeps the connection alive on Vercel and gives
 * the user feedback while the pipeline runs.
 */

import { NextRequest } from "next/server";
import { SearchRequest } from "@/types";
import { runPipeline } from "@/lib/pipeline";

// Vercel Pro allows up to 300s; Hobby plan is 60s.
// Set to 120s — upgrade your Vercel plan if you need more.
export const maxDuration = 120;

// Disable body size limit for streaming
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body: SearchRequest = await req.json();

    // Validate
    if (!body.query || body.query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!process.env.OSV_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OSV_API_KEY is not configured. Set it in Vercel Environment Variables." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured. Set it in Vercel Environment Variables." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a readable stream that sends SSE events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(type: string, data: Record<string, unknown>) {
          const payload = JSON.stringify({ type, ...data });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }

        try {
          // Run the pipeline with status callback
          const result = await runPipeline(body, (stage: string, message: string, progress?: number) => {
            sendEvent("status", { stage, message, progress });
          });

          // Send final result
          sendEvent("result", { data: result });
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : "An unexpected error occurred";
          sendEvent("error", {
            error: errMsg,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    console.error("Pipeline error:", error);
    const errMsg = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(
      JSON.stringify({
        error: errMsg,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
