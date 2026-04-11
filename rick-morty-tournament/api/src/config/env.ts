import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off", ""].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1).default("file:/data/rick-morty-tournament.sqlite"),
  ASSET_STORAGE_DIR: z.string().min(1).default("/data/assets"),
  RICK_AND_MORTY_API_BASE_URL: z.string().url().default("https://rickandmortyapi.com/api"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_BASE_URL: z.string().url().default("https://generativelanguage.googleapis.com/v1beta"),
  GEMINI_MODEL: z.string().default("gemini-3.1-flash-lite-preview"),
  ENABLE_GEMINI_ENRICHMENT: booleanFromEnv.default(false),
  SYNC_DEFAULT_PAGE_SIZE: z.coerce.number().int().positive().default(20)
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(input);
}
