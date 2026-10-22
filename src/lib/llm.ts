import { z } from "zod";

const BASE = () => (process.env.LITELLM_BASE_URL ?? "https://aiadda.kukufm.com/api/litellm/v1").replace(/\/+$/, "");
export const SMART = () => process.env.LLM_MODEL ?? "anthropic/claude-sonnet-5";
export const FAST = () => process.env.LLM_FAST_MODEL ?? "anthropic/claude-haiku-4-5";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
export type ToolDef = { name: string; description: string; parameters: Record<string, unknown> };
export type ToolCall = { name: string; args: unknown };

export class LlmError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

type CompleteOpts = {
  model?: string;
  messages: ChatMsg[];
  tools?: ToolDef[];
  /** "auto" | "required" | a tool name to force */
  toolChoice?: string;
  maxTokens?: number;
  timeoutMs?: number;
};

async function once(o: CompleteOpts) {
  const key = process.env.LITELLM_API_KEY;
  if (!key) throw new LlmError("LITELLM_API_KEY is not set");
  const body: Record<string, unknown> = {
    model: o.model ?? SMART(),
    max_tokens: o.maxTokens ?? 2000,
    messages: o.messages,
  };
  if (o.tools?.length) {
    body.tools = o.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
    const c = o.toolChoice ?? "auto";
    body.tool_choice = c === "auto" || c === "required" ? c : { type: "function", function: { name: c } };
  }
  const res = await fetch(`${BASE()}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(o.timeoutMs ?? 60_000),
  });
  if (!res.ok) throw new LlmError(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
  const j = await res.json();
  const msg = j.choices?.[0]?.message;
  if (!msg) throw new LlmError("LLM returned no message");
  const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((t: { function: { name: string; arguments: string } }) => {
    let args: unknown = {};
    try {
      args = JSON.parse(t.function.arguments || "{}");
    } catch {
      args = { __unparseable: t.function.arguments };
    }
    return { name: t.function.name, args };
  });
  return { text: (msg.content ?? "") as string, toolCalls };
}

/** Retries transient failures (429/5xx/timeouts/network) with backoff; permanent 4xx fail fast. */
export async function complete(o: CompleteOpts, attempts = 3) {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await once(o);
    } catch (e) {
      last = e;
      const status = e instanceof LlmError ? e.status : undefined;
      if (status && status < 500 && status !== 429 && status !== 408) break;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 700 * 2 ** i));
    }
  }
  throw last instanceof LlmError ? last : new LlmError(String((last as Error)?.message ?? last));
}

/**
 * Structured output via a forced tool call, validated with zod. One repair attempt that shows the
 * model its own validation errors, then it throws - callers decide the fallback.
 */
export async function completeJSON<T extends z.ZodType>(
  o: Omit<CompleteOpts, "tools" | "toolChoice"> & { schema: T; toolName: string; toolDescription: string },
): Promise<z.infer<T>> {
  const parameters = z.toJSONSchema(o.schema) as Record<string, unknown>;
  delete parameters.$schema;
  const tools = [{ name: o.toolName, description: o.toolDescription, parameters }];
  let messages = o.messages;
  let lastErr = "";
  for (let i = 0; i < 2; i++) {
    const r = await complete({ ...o, messages, tools, toolChoice: o.toolName });
    const call = r.toolCalls.find((t) => t.name === o.toolName);
    const parsed = o.schema.safeParse(call?.args);
    if (parsed.success) return parsed.data;
    lastErr = parsed.error.message.slice(0, 600);
    messages = [
      ...o.messages,
      { role: "user", content: `Your last ${o.toolName} call failed validation: ${lastErr}\nCall ${o.toolName} again with a corrected payload.` },
    ];
  }
  throw new LlmError(`Structured output failed validation: ${lastErr}`);
}
