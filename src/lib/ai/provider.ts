import type { z } from "zod";
import { env } from "@/lib/env";

/**
 * Minimal Gemini client.
 *
 * Why a hand-rolled fetch instead of an SDK: the only thing we need is one
 * JSON-mode call, and keeping it at this size means the whole AI layer is
 * auditable, has no transitive dependencies, and is trivial to point at another
 * provider (the only provider-specific part is `buildRequest`).
 *
 * Every call is wrapped in a Zod schema, so malformed model output is treated
 * exactly like an outage: the caller falls back to its deterministic engine.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 15_000;

export type AiSource = "ai" | "heuristic";

export type AiResult<T> =
  | { ok: true; data: T; source: "ai" }
  | { ok: false; reason: "disabled" | "network" | "invalid" | "blocked" };

/** JSON-schema subset Gemini accepts for structured output. */
export type ResponseSchema = {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  properties?: Record<string, ResponseSchema>;
  items?: ResponseSchema;
  required?: string[];
  enum?: string[];
  nullable?: boolean;
  description?: string;
};

export async function generateJson<T>(args: {
  system: string;
  prompt: string;
  responseSchema: ResponseSchema;
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<AiResult<T>> {
  const { GEMINI_API_KEY, GEMINI_MODEL } = env();
  if (!GEMINI_API_KEY) return { ok: false, reason: "disabled" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: args.system }] },
          contents: [{ role: "user", parts: [{ text: args.prompt }] }],
          generationConfig: {
            temperature: args.temperature ?? 0.2,
            responseMimeType: "application/json",
            responseSchema: args.responseSchema,
          },
        }),
      },
    );

    if (!response.ok) {
      console.error("[ai] gemini responded %s: %s", response.status, await response.text());
      return { ok: false, reason: response.status === 429 ? "blocked" : "network" };
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (!text.trim()) return { ok: false, reason: "invalid" };

    const parsed = args.schema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.error("[ai] schema mismatch: %s", parsed.error.message);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: parsed.data, source: "ai" };
  } catch (error) {
    console.error("[ai] call failed:", error);
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timeout);
  }
}
