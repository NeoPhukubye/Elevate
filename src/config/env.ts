import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z
    .string()
    .transform((v) => v.toLowerCase())
    .pipe(z.enum(["development", "production", "test"]))
    .default("development"),
  DATABASE_URL: z.string().default(""),
  JWT_SECRET: z.string().default("elevate-dev-secret-key-12345678"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AI_PROVIDER: z.string().default("gemini"),
  AI_API_KEY: z.string().default(""),
  AI_MODEL: z.string().default("gemini-2.0-flash"),
  AI_MAX_TOKENS: z.coerce.number().default(1500),
  AI_TEMPERATURE: z.coerce.number().min(0).max(1).default(0.4),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.error) {
  Object.assign(process.env, parsed.data);
}

export const env = parsed.data ?? {
  PORT: 4000,
  NODE_ENV: "development" as const,
  DATABASE_URL: "",
  JWT_SECRET: "elevate-dev-secret-key-12345678",
  JWT_EXPIRES_IN: "7d",
  AI_PROVIDER: "gemini",
  AI_API_KEY: "",
  AI_MODEL: "gemini-2.0-flash",
  AI_MAX_TOKENS: 1500,
  AI_TEMPERATURE: 0.4,
  RATE_LIMIT_WINDOW_MS: 900000,
  RATE_LIMIT_MAX: 100,
};