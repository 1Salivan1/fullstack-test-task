import { z } from "zod";

/**
 * Fail fast on misconfiguration, but only for variables we truly cannot work
 * without. GEMINI_API_KEY is deliberately optional: every AI feature has a
 * deterministic fallback, so the app must boot and work without it.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().optional().default("gemini-2.5-flash-lite"),
  DEMO_PASSWORD: z.string().optional().default("demo1234"),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const aiEnabled = () => env().GEMINI_API_KEY.length > 0;
