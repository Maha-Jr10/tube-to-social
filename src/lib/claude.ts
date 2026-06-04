import OpenAI from "openai";
import { jsonrepair } from "jsonrepair";

export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "google/gemma-4-31b-it:free";

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
}

export async function callClaude(system: string, user: string): Promise<string> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: OPENROUTER_MODEL,
    max_tokens: 8192,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenRouter");
  return text.trim();
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  return JSON.parse(jsonrepair(cleaned)) as T;
}

export async function callClaudeJson<T>(system: string, user: string): Promise<T> {
  const raw = await callClaude(system, user);
  try {
    return parseJson<T>(raw);
  } catch {
    const retryRaw = await callClaude(
      system,
      `${user}\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the raw JSON — no text before or after it, no markdown code fences.`
    );
    return parseJson<T>(retryRaw);
  }
}
