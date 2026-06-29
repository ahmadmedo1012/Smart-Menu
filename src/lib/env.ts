import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").optional().default("default-dev-key-1234567890"),
  NEXT_PUBLIC_DOMAIN: z.string().url().optional().default("http://localhost:3000"),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional().default(""),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_CHAT_ID: z.string().optional().default(""),
  AUTH_SECRET: z.string().optional().default(""),
  DATABASE_SCHEMA: z.string().optional().default("public"),
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("Environment validation failed");
    }
    console.warn("Using partial defaults in development");
    return envSchema.partial().parse(process.env);
  }
  return parsed.data;
}

export const env: Record<string, string | undefined> = process.env;
