/**
 * Provider-neutral LLM access (server only).
 *
 * Talks to any OpenAI-compatible Chat Completions endpoint (OpenAI, OpenRouter, Groq, Azure OpenAI,
 * local Ollama / LM Studio …). Configure with:
 *   AI_API_KEY   secret key (omit for local servers that need none, but then set AI_BASE_URL)
 *   AI_BASE_URL  default https://api.openai.com/v1
 *   AI_MODEL     default gpt-4o-mini
 * When nothing is configured the callers fall back to the built-in heuristic engine and label the
 * result as such.
 */
export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export function llmConfigured(): boolean {
  return !!(process.env["AI_API_KEY"]?.trim() || process.env["AI_BASE_URL"]?.trim());
}

export class LlmError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "LlmError";
  }
}

export async function llmChat(messages: LlmMessage[], opts: { json?: boolean; maxTokens?: number } = {}): Promise<string> {
  if (!llmConfigured()) throw new LlmError("No AI provider is configured. Set AI_API_KEY (and optionally AI_BASE_URL / AI_MODEL).");
  const base = (process.env["AI_BASE_URL"]?.trim() || "https://api.openai.com/v1").replace(/\/+$/, "");
  const key = process.env["AI_API_KEY"]?.trim();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({
      model: process.env["AI_MODEL"]?.trim() || "gpt-4o-mini",
      messages,
      temperature: 0.2,
      ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[ai] provider error", res.status, body.slice(0, 500));
    if (res.status === 429) throw new LlmError("Too many requests right now — please try again in a minute.", 429);
    if (res.status === 401 || res.status === 403) throw new LlmError("The AI provider rejected the configured API key.", res.status);
    if (res.status === 402) throw new LlmError("The AI provider reports that credits are exhausted.", 402);
    throw new LlmError("The AI couldn't answer right now.", res.status);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new LlmError("The AI returned an empty response.");
  return content;
}
