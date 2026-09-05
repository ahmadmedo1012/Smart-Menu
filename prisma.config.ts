import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: env("DATABASE_URL"),
        // Shadow DB for `migrate diff/dev` — auto-created scratch database.
        // Optional: only set for local parity checks; plain `migrate deploy`
        // (CI/Vercel) never needs it. Use process.env (Prisma's env() helper
        // throws when the variable is absent).
        shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL || undefined,
    },
});
