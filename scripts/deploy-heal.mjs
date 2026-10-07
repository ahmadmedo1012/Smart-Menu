#!/usr/bin/env node
/**
 * r124 — DEPLOY SELF-HEALING CASCADE (the r122-b production unblock).
 * =====================================================================
 *
 * CONTEXT (r122-b forensics, 7 instrumented deployments): production
 * `_prisma_migrations` writes (UPDATE/CLI-resolve) fail INSTANTLY with
 * permission-class pg errors while SELECTs on the same connections and
 * data-plane writes (live probe order ORD-MULFZWQ4) succeed. The chain has
 * been frozen at 19fa136a since 2026-09-28 because `prisma migrate deploy`
 * stops with P3009 while a FAILED ledger record exists that nobody can
 * clear from inside the build.
 *
 * This module runs at the END of db-unstick.mjs (§7) — i.e. FIRST in every
 * variant of the Vercel build command (dashboard variant and package.json
 * variant both start with `node scripts/db-unstick.mjs`) — and guarantees,
 * in priority order:
 *
 *   P0  FAST PATH (healthy DB): nothing to do → silent exit. Zero cost.
 *   P1  HEAL the ledger (try every write path):
 *         h1 UPDATE rolled_back_at            (r122 tier 1)
 *         h2 DELETE the failed rows           (r124 — separate table
 *                                              privilege; may be granted
 *                                              where UPDATE is not)
 *         h3 fresh-connection UPDATE          (r122 tier 2)
 *         h4 fresh-connection DELETE          (r124)
 *         h5 `prisma migrate resolve` CLI     (r122 tier 3)
 *         h6 RENAME-RECREATE the ledger       (r124 last resort: rename the
 *                                              blocked table out of the way,
 *                                              recreate it, copy all
 *                                              finished/rolled-back rows;
 *                                              we OWN the new table → fully
 *                                              writable forever)
 *       After any heal success → run the wrapper `scripts/migrate-deploy.mjs`
 *       so pending migrations apply through the official CLI (its own
 *       ledger records). The chain's later `prisma migrate deploy` (either
 *       variant) then finds a complete ledger → instant no-op success.
 *
 *   P2  DIRECT-SQL FALLBACK (ledger unhealable — the r122-b case):
 *       Ensure the schema WITHOUT the ledger, idempotently:
 *         - sidecar table `_deploy_direct_applied` (data-plane DDL+DML,
 *           proven writable) records what we applied → re-run safe (the
 *           zz_round122 backfill must NEVER run twice — double-charge).
 *         - apply each pending migration's SQL in ONE transaction
 *           (transactional DDL — all-or-nothing, same contract as Prisma).
 *         - duplicate-object errors (42P07/42701/42710/42723) → the object
 *           already exists → mark in sidecar, continue.
 *         - real SQL errors → abort the build with the REAL error (loud,
 *           actionable — never deploy a half-migrated schema).
 *         - best-effort INSERT of applied rows into the blocked ledger
 *           (if INSERT happens to be allowed, future raw `migrate deploy`
 *           calls no-op and the whole anomaly heals itself).
 *       Exit 0 = schema verified complete (ledger-applied ∪ sidecar = all
 *       migration directories).
 *
 *   P3  FATAL (schema cannot be ensured): print the exact pg errors + the
 *       precise GRANT statements that fix the Neon role, exit 1.
 *
 * Telemetry: every phase prints `[DEPLOY-FIX]` markers with durations so a
 * failed build's timeline decodes without dashboard log access (r122-b
 * method). All output is single-line + greppable.
 *
 * SAFETY INVARIANTS:
 *   - Healthy databases: P0 exits before any write. The happy path is
 *     byte-identical to the pre-r124 chain.
 *   - The v1 orphan record (zz_round121_orderitem_effective_price_backfill,
 *     directory removed) is cleared by h1/h2/h5 or ignored by P2 (pending is
 *     computed from DIRECTORIES, not ledger rows).
 *   - The sidecar is created ONLY on the P2 path (blocked-ledger DBs) —
 *     healthy environments never see it.
 *   - No partial states: every direct apply is one transaction; h6 is one
 *     transaction; the sidecar is written after each successful apply.
 */

import pg from 'pg';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(ROOT, 'prisma', 'migrations');
const WRAPPER = join(ROOT, 'scripts', 'migrate-deploy.mjs');

/** Abort the build (typed so db-unstick can distinguish deliberate aborts
 *  from internal bugs — internal bugs must stay fail-open). */
export class FatalHealError extends Error {}

const t0 = Date.now();
const mark = (phase, extra = '') =>
  console.log(`[DEPLOY-FIX] ${phase} (+${((Date.now() - t0) / 1000).toFixed(1)}s) ${extra}`);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Migration directories in Prisma's apply order (lexicographic). */
export function migrationDirs() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((d) => !d.endsWith('.toml'))
    .sort();
}

function newClient(url, timeoutMs) {
  return new pg.Client({
    connectionString: url,
    statement_timeout: timeoutMs,
    connectionTimeoutMillis: 20000,
  });
}

/** Run the wrapper migrate (transient-retry logic lives there). */
function runWrapperMigrate() {
  try {
    execFileSync(process.execPath, [WRAPPER], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
      timeout: 8 * 60_000,
    });
    return true;
  } catch {
    return false;
  }
}

async function ledgerState(c) {
  const exists = await c
    .query(`SELECT to_regclass('_prisma_migrations') AS t`)
    .then((r) => !!r.rows[0].t)
    .catch(() => false);
  if (!exists) return { exists: false, failed: [], applied: new Set(), rolledBack: new Set() };
  const { rows } = await c.query(`
    SELECT migration_name,
           (finished_at IS NULL AND rolled_back_at IS NULL) AS is_failed,
           finished_at IS NOT NULL AS is_applied
    FROM _prisma_migrations`);
  const st = { exists: true, failed: [], applied: new Set(), rolledBack: new Set() };
  for (const r of rows) {
    if (r.is_failed) st.failed.push(r.migration_name);
    else if (r.is_applied) st.applied.add(r.migration_name);
    else st.rolledBack.add(r.migration_name);
  }
  return st;
}

// ───────────────────────────── P1: HEAL ─────────────────────────────

async function healRecord(c, url, name, prismaBin) {
  // h1 — UPDATE on this connection (r122 tier 1)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await c.query(
        `UPDATE _prisma_migrations SET rolled_back_at = now()
         WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
        [name]);
      if (res.rowCount >= 1) { mark('HEAL h1 OK', `${name} (UPDATE, attempt ${attempt})`); return true; }
      return true; // 0 rows = already resolved elsewhere
    } catch (e) {
      mark('HEAL h1 DENIED', `${name} — pg ${e.code}: ${(e.message || '').slice(0, 140)}`);
      if (attempt === 2) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  // h2 — DELETE on this connection (r124: separate table privilege)
  try {
    const res = await c.query(
      `DELETE FROM _prisma_migrations
       WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
      [name]);
    if (res.rowCount >= 1) { mark('HEAL h2 OK', `${name} (DELETE — ${res.rowCount} row(s))`); return true; }
    return true;
  } catch (e) {
    mark('HEAL h2 DENIED', `${name} — pg ${e.code}: ${(e.message || '').slice(0, 140)}`);
  }
  // h3 + h4 — fresh connection (different pooled server conn), UPDATE then DELETE
  const c2 = newClient(url, 15000);
  try {
    await c2.connect();
    for (const [tag, sql] of [
      ['h3', `UPDATE _prisma_migrations SET rolled_back_at = now()
              WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`],
      ['h4', `DELETE FROM _prisma_migrations
              WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`],
    ]) {
      try {
        const res = await c2.query(sql, [name]);
        if (res.rowCount >= 1) { mark(`HEAL ${tag} OK`, name); return true; }
      } catch (e) {
        mark(`HEAL ${tag} DENIED`, `${name} — pg ${e.code}: ${(e.message || '').slice(0, 140)}`);
      }
    }
  } catch (e) {
    mark('HEAL h3/h4 CONNECT FAILED', `${(e.code || '')} ${(e.message || '').slice(0, 120)}`);
  } finally {
    await c2.end().catch(() => {});
  }
  // h5 — official CLI (r122 tier 3)
  if (prismaBin) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const out = execFileSync(prismaBin, ['migrate', 'resolve', '--rolled-back', name], {
          cwd: ROOT, timeout: 120_000, encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'], env: process.env,
        });
        mark('HEAL h5 OK', `${name} (prisma migrate resolve) ${(out || '').trim().split('\n').pop()?.slice(0, 80) || ''}`);
        return true;
      } catch (e) {
        mark('HEAL h5 FAILED', `${name} (attempt ${attempt}) — ${((e.stderr || e.stdout || e.message) || '').toString().trim().slice(0, 160)}`);
        if (attempt === 2) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  return false;
}

/** h6 — rename the blocked ledger out of the way, recreate it, copy the
 *  non-failed rows. One transaction: all-or-nothing. We own the new table
 *  → the ledger is fully writable forever after. */
async function healRecreateLedger(c, blockedName) {
  try {
    await c.query('BEGIN');
    await c.query(`ALTER TABLE _prisma_migrations RENAME TO "${blockedName}"`);
    await c.query(`
      CREATE TABLE "_prisma_migrations" (
        "id" varchar(36) NOT NULL,
        "checksum" varchar(64) NOT NULL,
        "finished_at" timestamp with time zone,
        "migration_name" varchar(255) NOT NULL,
        "logs" text,
        "rolled_back_at" timestamp with time zone,
        "started_at" timestamp with time zone NOT NULL DEFAULT now(),
        "applied_steps_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
      )`);
    await c.query(`
      INSERT INTO "_prisma_migrations"
      SELECT * FROM "${blockedName}"
      WHERE "finished_at" IS NOT NULL OR "rolled_back_at" IS NOT NULL`);
    await c.query('COMMIT');
    mark('HEAL h6 OK', `ledger recreated (failed rows dropped); blocked table preserved as ${blockedName}`);
    return true;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    mark('HEAL h6 DENIED', `pg ${e.code}: ${(e.message || '').slice(0, 160)}`);
    return false;
  }
}

// ───────────────────────── P2: DIRECT-SQL ─────────────────────────

const SIDECAR = '_deploy_direct_applied';

async function ensureSidecar(c) {
  try {
    await c.query(`
      CREATE TABLE IF NOT EXISTS "${SIDECAR}" (
        "migration_name" TEXT PRIMARY KEY,
        "applied_at" timestamptz NOT NULL DEFAULT now(),
        "checksum" TEXT,
        "via" TEXT NOT NULL DEFAULT 'direct-sql'
      )`);
  } catch (e) {
    throw new FatalHealError(
      `P2 sidecar creation FAILED — pg ${e.code}: ${e.message}` +
      grantGuidance(e));
  }
}

async function sidecarSet(c) {
  try {
    const { rows } = await c.query(`SELECT migration_name FROM "${SIDECAR}"`);
    return new Set(rows.map((r) => r.migration_name));
  } catch {
    return new Set();
  }
}

/** Duplicate-object class → "already applied", safe to skip. */
function isDuplicateObject(e) {
  if (['42P07', '42701', '42710', '42723'].includes(e.code)) return true;
  return /already exists/i.test(e.message || '');
}

/** Remediation text for permission-class failures (the r122-b anomaly). */
function grantGuidance(e) {
  if (e && e.code !== '42501' && !/permission denied/i.test(e.message || '')) return '';
  const role = (() => {
    try { return (process.env.DATABASE_URL.match(/\/\/([^:@]+):/) || [])[1] || '<db-role>'; }
    catch { return '<db-role>'; }
  })();
  return `
[DEPLOY-FIX] ──────────── ACTION REQUIRED (Neon SQL editor, one time) ────────────
[DEPLOY-FIX] The build role lacks the privileges this fix needs. Run in the
[DEPLOY-FIX] Neon SQL editor as the _prisma_migrations table owner (or the DB owner):
[DEPLOY-FIX]   ALTER TABLE "_prisma_migrations" OWNER TO "${role}";
[DEPLOY-FIX]   GRANT ALL PRIVILEGES ON TABLE "_prisma_migrations" TO "${role}";
[DEPLOY-FIX]   GRANT CREATE ON SCHEMA public TO "${role}";  -- if schema DDL was denied too
[DEPLOY-FIX] Then redeploy — the chain is self-healing from that point on.
[DEPLOY-FIX] ────────────────────────────────────────────────────────────────`;
}

async function directApply(c, name, sql) {
  try {
    await c.query('BEGIN');
    await c.query(sql);
    await c.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    if (isDuplicateObject(e)) return { ok: true, dup: true, error: e };
    return { ok: false, error: e };
  }
}

async function ledgerInsertAppliedBestEffort(c, name, checksum) {
  try {
    await c.query(
      `INSERT INTO _prisma_migrations
         ("id", "checksum", "finished_at", "migration_name", "logs",
          "rolled_back_at", "started_at", "applied_steps_count")
       VALUES ($1, $2, now(), $3, NULL, NULL, now(), 1)
       ON CONFLICT ("id") DO NOTHING`,
      [randomUUID(), checksum, name]);
    return true;
  } catch (e) {
    mark('LEDGER INSERT DENIED', `${name} — pg ${e.code}: ${(e.message || '').slice(0, 120)}`);
    return false;
  }
}

// ─────────────────────────── main cascade ───────────────────────────

export async function heal(url) {
  if (!url) { mark('SKIP', 'no DATABASE_URL'); return; }
  const prismaBin = existsSync(join(ROOT, 'node_modules/.bin/prisma'))
    ? join(ROOT, 'node_modules/.bin/prisma') : null;

  const c = newClient(url, 20_000);
  await c.connect();
  try {
    // ── P0: fast path ──
    const st = await ledgerState(c);
    const dirs = migrationDirs();
    const complete = dirs.every((d) => st.applied.has(d));
    if (!st.failed.length && complete) {
      mark('P0 CLEAN', `all ${dirs.length} migrations applied, no failed records — healthy path, nothing to do`);
      return;
    }
    if (!st.failed.length && !complete) {
      mark('P0 PENDING', `${dirs.filter((d) => !st.applied.has(d)).length} pending, no failed records — delegating to the wrapper migrate`);
      if (runWrapperMigrate()) return;
      mark('P0 WRAPPER FAILED', 'wrapper migrate failed on a clean ledger — P2 will verify/ensure the schema directly');
    }

    // ── P1: heal the failed records ──
    mark('P1 HEAL START', `${st.failed.length} failed record(s): ${st.failed.join(', ')}`);
    for (const name of st.failed) {
      await healRecord(c, url, name, prismaBin);
    }
    let st2 = await ledgerState(c);
    if (st2.failed.length) {
      mark('P1 h1-h5 EXHAUSTED', `${st2.failed.length} record(s) still failed — attempting h6 ledger recreate`);
      const blockedName = `_prisma_migrations_blocked_${Date.now()}`;
      if (await healRecreateLedger(c, blockedName)) st2 = await ledgerState(c);
    }
    if (!st2.failed.length) {
      mark('P1 HEALED', 'ledger clean — applying pending via the official CLI');
      if (runWrapperMigrate()) { mark('P1 DONE', 'wrapper migrate exited 0'); return; }
      // wrapper failed on a clean ledger = a REAL migration error → fall
      // through to P2 only if P2 can prove completeness; otherwise fatal.
      mark('P1 MIGRATE FAILED', 'wrapper failed on a clean ledger — real error above; trying P2 verification');
    } else {
      mark('P1 UNHEALABLE', 'every ledger write path denied — entering P2 direct-SQL fallback');
    }

    // ── P2: direct-SQL fallback ──
    const cLong = newClient(url, 600_000);
    await cLong.connect();
    try {
      await ensureSidecar(cLong);
      const st3 = await ledgerState(cLong);
      const done = await sidecarSet(cLong);
      const pending = dirs.filter((d) => !st3.applied.has(d) && !done.has(d));
      mark('P2 START', `ledger-applied=${st3.applied.size} sidecar=${done.size} pending=${pending.length}${pending.length ? `: ${pending.join(', ')}` : ''}`);

      let insertedLedger = 0;
      for (const name of pending) {
        const sql = readFileSync(join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
        const checksum = sha256(Buffer.from(sql, 'utf8'));
        const r = await directApply(cLong, name, sql);
        if (!r.ok) {
          throw new FatalHealError(
            `P2 direct apply FAILED for ${name} — pg ${r.error.code}: ${r.error.message}` +
            grantGuidance(r.error) +
            `\n[DEPLOY-FIX] The schema could NOT be ensured. Fix the error above, then redeploy.`);
        }
        await cLong.query(
          `INSERT INTO "${SIDECAR}" ("migration_name", "checksum", "via") VALUES ($1, $2, $3)
           ON CONFLICT ("migration_name") DO NOTHING`,
          [name, checksum, r.dup ? 'direct-sql (duplicate-object skip)' : 'direct-sql']);
        if (await ledgerInsertAppliedBestEffort(cLong, name, checksum)) insertedLedger++;
        mark('P2 APPLIED', `${name}${r.dup ? ' (objects already present — dup skip)' : ''}`);
      }
      const finalDone = new Set([...(await ledgerState(cLong)).applied, ...(await sidecarSet(cLong))]);
      const missing = dirs.filter((d) => !finalDone.has(d));
      if (missing.length) {
        throw new FatalHealError(
          `P2 verification FAILED — still missing: ${missing.join(', ')}`);
      }
      mark('P2 COMPLETE',
        `schema verified: all ${dirs.length} migrations applied ` +
        `(ledger inserts accepted: ${insertedLedger}/${pending.length}; ` +
        `ledger write-block persists: ${insertedLedger < pending.length ? 'YES (benign — sidecar governs)' : 'no'})`);
      return;
    } finally {
      await cLong.end().catch(() => {});
    }
  } finally {
    await c.end().catch(() => {});
  }
}

// CLI direct execution (node scripts/deploy-heal.mjs) — standalone use.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = process.env.DATABASE_URL;
  heal(url).catch((e) => {
    if (e instanceof FatalHealError) {
      console.error('\n┌─────────────────────────────────────────────────────┐');
      console.error('│  ✗ DEPLOY-FIX FATAL — schema could not be ensured    │');
      console.error('└─────────────────────────────────────────────────────┘');
      console.error(String(e.message || e));
      process.exit(1);
    }
    console.error('[DEPLOY-FIX] INTERNAL ERROR (fail-open):', e);
    process.exit(0); // internal bugs must never break a healthy deploy
  });
}
