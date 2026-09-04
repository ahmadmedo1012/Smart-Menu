#!/usr/bin/env node
/**
 * round79 Stage H — build-time database sync (additive + idempotent).
 *
 * WHY THIS EXISTS
 * ───────────────
 * `@prisma/client`'s postinstall regenerates the client from the pushed
 * schema on every deploy. Full-scalar queries (e.g. GET /api/items uses
 * `include`) then reference the new MenuItem showcase columns and would
 * fail with P2022 ("column does not exist") on a database that has not
 * received them yet. The README documents production schema sync as a
 * MANUAL `npx prisma db push`; to keep every deploy zero-downtime, this
 * script runs the same additive DDL (ADD COLUMN IF NOT EXISTS) right
 * before `next build` — locally and on Vercel alike (DATABASE_URL is
 * available at build time: static generation already queries the DB).
 *
 * Stage F should replace this with a proper migration pipeline.
 *
 * Runs as the first step of `npm run build` (see package.json).
 */
import { readFileSync, existsSync } from 'node:fs';
import pg from 'pg';

const { Client } = pg;

// Minimal .env fallback — only for variables NOT already in the environment.
// Mirrors what @next/env does for `next build` (dev machines without an
// exported DATABASE_URL). Never overrides an existing env var.
if (existsSync('.env')) {
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"\r\n]*)"?\s*$/);
		if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
	}
}

const url = process.env.DATABASE_URL;
if (!url || !/^(postgres|postgresql):\/\//.test(url)) {
	console.error(
		'[round79-db-sync] DATABASE_URL missing or not a PostgreSQL URL — cannot sync. ' +
			'This build queries the database, so a valid DATABASE_URL is required anyway.'
	);
	process.exit(1);
}

// Keep in sync with prisma/migrations/10_add_menu_item_featured/migration.sql
const SQL = `
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "featuredRank" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "showcaseTag" VARCHAR(40);
`;

const client = new Client({ connectionString: url });
try {
	await client.connect();
	await client.query(SQL);
	console.log('[round79-db-sync] MenuItem showcase columns verified (idempotent).');
} catch (err) {
	console.error('[round79-db-sync] FAILED:', err.message);
	process.exit(1);
} finally {
	await client.end();
}
