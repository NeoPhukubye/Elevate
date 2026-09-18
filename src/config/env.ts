import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AI_PROVIDER: z.string().default("gemini"),
  AI_API_KEY: z.string().min(1, "AI_API_KEY is required"),
  AI_MODEL: z.string().default("gemini-2.0-flash"),
  AI_MAX_TOKENS: z.coerce.number().default(1500),
  AI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.4),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;