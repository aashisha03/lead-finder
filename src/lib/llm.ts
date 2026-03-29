/**
 * Claude LLM integration via Vercel AI Gateway
 * Uses the Anthropic SDK pointed at Vercel's AI Gateway base URL
 */

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      throw new Error("AI_GATEWAY_API_KEY is not set in environment variables");
    }
    client = new Anthropic({
/**
 * Claude LLM integration via OSV Engineering inference endpoint
  * Uses the OpenAI-compatible API format with OSV_API_KEY
   */
      
      const CLAUDE_URL = "https://developer.osv.engineering/inference/v1/chat/completions";
      const DEFAULT_MODEL = "anthropic/claude-sonnet-4-5-20250929";
    
    export async function callClaude(
        prompt: string,
        options?: {
              maxTokens?: number;
              temperature?: number;
              systemPrompt?: string;
        }
      ): Promise<string> {
        const apiKey = process.env.OSV_API_KEY;
        if (!apiKey) {
              throw new Error("OSV_API_KEY is not set in environment variables");
        }
      
        const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;
        const systemPrompt =
              options?.systemPrompt ||
              "You are a precise research assistant. Always return valid JSON. Never include markdown code fences in your output.";
      
        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
            ];
      
        const response = await fetch(CLAUDE_URL, {
              method: "POST",
              headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                      model,
                      max_tokens: options?.maxTokens || 4096,
                      messages,
              }),
        });
      
        if (!response.ok) {
              const text = await response.text().catch(() => "(unreadable)");
              throw new Error(`Claude API ${response.status}: ${text}`);
        }
      
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new Error("No text response from Claude");
        return text;
    }
    
    export function parseJSON<T>(text: string): T {
        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
              cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
        }
        return JSON.parse(cleaned);
    }
      baseURL: "https://ai-gateway.vercel.sh",
    });
  }
  return client;
}

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";

export async function callClaude(
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
): Promise<string> {
  const anthropic = getClient();
  const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;

  const message = await anthropic.messages.create({
    model,
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature ?? 0.2,
    system:
      options?.systemPrompt ||
      "You are a precise research assistant. Always return valid JSON. Never include markdown code fences in your output.",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract text from the response
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textBlock.text;
}

/**
 * Parse JSON from Claude's response, handling potential markdown fences
 */
export function parseJSON<T>(text: string): T {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned);
}
