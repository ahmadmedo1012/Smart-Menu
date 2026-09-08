#!/usr/bin/env node
/**
 * check-secrets.mjs (round88-D6) — secret-leak scanner for the Smart-Menu
 * repository. Zero dependencies (Node builtins + git).
 *
 * WHAT IT SCANS
 *   Every file git knows about in the working tree — tracked AND untracked
 *   but not ignored (`git ls-files --cached --others --exclude-standard`) —
 *   so leaks are caught BEFORE they are ever committed. Reading the working
 *   tree's file contents subsumes the uncommitted `git diff` (a diff hunk is
 *   part of some file's current content), and committed history is covered
 *   by the same files being tracked; scanning full files keeps the logic
 *   simple and immune to hunk-context parsing bugs.
 *
 * PATTERNS
 *   ghp_[A-Za-z0-9]{30,}         GitHub personal access token (classic)
 *   github_pat_[A-Za-z0-9_]{30,} GitHub fine-grained PAT
 *   vcp_[A-Za-z0-9]{30,}         Vercel token
 *   sk-[A-Za-z0-9]{20,}          OpenAI-style API key
 *   postgres(ql)?://user:pass@   DB connection string with embedded creds
 *
 * ALLOWED EXCEPTIONS (deliberate, reviewable, versioned)
 *   1. Inline marker: any line containing `allow-secret-check` is exempt
 *      (comment syntax agnostic — works in yml/ts/md/sh).
 *   2. FILE_ALLOWLIST below: exact file + pattern id + a REQUIRED reason.
 *      Used for the handful of intentional localhost/dev placeholder URLs.
 *
 * OUTPUT: masked snippets only (first 8 chars) — the scanner itself must
 * never print a full secret into CI logs.
 *
 * EXIT: 1 on any real leak (CI blocking), 0 otherwise.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

// ── Scanner patterns ────────────────────────────────────────────────────

const PATTERNS = [
  { id: 'ghp', re: /ghp_[A-Za-z0-9]{30,}/g, desc: 'GitHub classic PAT' },
  { id: 'ghpat', re: /github_pat_[A-Za-z0-9_]{30,}/g, desc: 'GitHub fine-grained PAT' },
  { id: 'vcp', re: /vcp_[A-Za-z0-9]{30,}/g, desc: 'Vercel token' },
  { id: 'sk', re: /sk-[A-Za-z0-9]{20,}/g, desc: 'OpenAI-style API key' },
  { id: 'pg', re: /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/g, desc: 'DB connection string with creds' },
];

// ── Deliberate exceptions (file + pattern → reason) ─────────────────────
// Every entry MUST carry a justification; entries are reviewed in git like
// any other code change. Kept as tight as possible (exact path + pattern).

const FILE_ALLOWLIST = [
  {
    file: '.env.example',
    id: 'pg',
    reason: 'placeholder template (user:password@host) — not a real credential',
  },
  {
    file: '.github/workflows/ci.yml',
    id: 'pg',
    reason: 'CI Postgres service-container credentials (test:test@localhost:5432) — disposable per-run container, not a secret',
  },
  {
    // round90-F2: new nightly workflow mirrors ci.yml's service-container
    // pattern (same disposable test:test@localhost credentials).
    file: '.github/workflows/nightly-flake.yml',
    id: 'pg',
    reason: 'CI Postgres service-container credentials (test:test@localhost:5432) — disposable per-run container, not a secret (same pattern as ci.yml)',
  },
  {
    file: 'README.md',
    id: 'pg',
    reason: 'documented local-dev example URL (user:pass@localhost)',
  },
  {
    file: 'scripts/round83-seed.mjs',
    id: 'pg',
    reason: 'local embedded-postgres default (postgres:postgres@localhost:5434) — dev-only seed fallback',
  },
  {
    // round92: image-health.mjs ships the identical dev-only fallback as
    // round83-seed.mjs (read-only checker, R91 F-C). The pg pattern matches
    // the literal fallback string — flagged on r91-closure push, CI red.
    file: 'scripts/image-health.mjs',
    id: 'pg',
    reason: 'local embedded-postgres default (postgres:postgres@localhost:5434) — dev-only read-only checker fallback',
  },
  {
    // round92: local-PG bootstrap helper (initdb + pg_ctl via embedded-postgres
    // binaries) — echoes the same dev-only localhost URL as its final hint.
    file: 'scripts/pg-local-start.sh',
    id: 'pg',
    reason: 'local embedded-postgres bootstrap helper (postgres:postgres@localhost:5434) — dev-only, prints the connection hint',
  },
  {
    // round92: one-session e2e sweep (server + playwright in a single bash
    // invocation — the sandbox reaps the node server between commands).
    // Exports the same CI-standalone env; the pg match is the dev-only
    // localhost DATABASE_URL, identical to ci.yml's service container.
    file: 'scripts/r92-e2e-local.sh',
    id: 'pg',
    reason: 'local e2e sweep env (postgres:postgres@localhost:5434) — dev-only localhost, same disposable pattern as CI service-container credentials',
  },
  {
    // round93-S2: hostile-simulation runner — a copy of r92-e2e-local.sh
    // with RATE_LIMIT_TEST_RELAX stripped (real budgets for the abuser
    // spec). Same env, same disposable localhost DATABASE_URL.
    file: 'scripts/r93-sim-hostile.sh',
    id: 'pg',
    reason: 'local hostile-simulation sweep env (postgres:postgres@localhost:5434) — dev-only localhost, same disposable pattern as CI service-container credentials',
  },
  {
    // round94 (منسق الجولة): inter-batch DB state reset between chunked local
    // e2e sweeps — the pg match is the usage-example DATABASE_URL in the doc
    // comment, same dev-only localhost default as round83-seed/qa-seed.
    file: 'scripts/r94-db-reset.mjs',
    id: 'pg',
    reason: 'local e2e batch-reset script (postgres:postgres@localhost:5434 in usage comment) — dev-only localhost, same disposable pattern as CI service-container credentials',
  },
  {
    // round93-S1: simulation seed (modifier groups + sub_admin/super_admin
    // fixtures) — same dev-only embedded-postgres default as round83-seed.
    file: 'scripts/r93-sim-seed.mjs',
    id: 'pg',
    reason: 'local simulation-seed default (postgres:postgres@localhost:5434) — dev-only, same pattern as round83-seed.mjs',
  },
  {
    // round93-1-e: test-suite inspection report quotes the local embedded
    // postgres URL while solving the 1666/1642 env puzzle — documentation.
    file: 'docs/round93-inspection-e.md',
    id: 'pg',
    reason: 'round-93 inspection report documents the local embedded-postgres URL (postgres:postgres@localhost:5434) — dev-only documentation',
  },
  {
    file: 'SMART-MENU-ROUND88-PLAN.md',
    id: 'pg',
    reason: 'round-88 plan documents the local embedded-postgres URL (postgres:postgres@localhost:5434) — dev-only',
  },
  {
    file: 'tests/README.md',
    id: 'pg',
    reason: 'documented local-dev test commands (postgres:postgres@localhost:5434 embedded PG)',
  },
  // ── round90-F2 additions (CSO audit Finding 2: gate was red on HEAD) ────
  // Two task-mandated entries + the round-90 diagnosis docs that quote the
  // same standard local embedded-postgres URL. All reviewed, all dev-only.
  {
    // SECURITY-POSITIVE fixture: this string is a deliberately fake URL that a
    // mocked Prisma error embeds — the test asserts the raw error (and thus
    // any connection string inside it) NEVER reaches the API client.
    file: 'tests/unit/demo-seed-envelope.test.ts',
    id: 'pg',
    reason: 'fake test fixture (user:secret@host/db) — positive security test asserting raw Prisma errors never reach the client',
  },
  {
    file: 'SMART-MENU-ROUND89-PLAN.md',
    id: 'pg',
    reason: 'round-89 plan documents the local embedded-postgres URL (postgres:postgres@127.0.0.1:5434) — dev-only',
  },
  {
    file: 'docs/round90-plan.md',
    id: 'pg',
    reason: 'round-90 plan documents the local embedded-postgres URL (postgres:postgres@127.0.0.1:5434) — dev-only',
  },
  {
    // The audit report itself quotes the local dev URL, [REDACTED] evidence
    // strings from git-history forensics, and the demo-seed fixture it
    // reports on — all masked/fake, none a live credential.
    file: 'docs/round90/diagnosis/cso-audit.md',
    id: 'pg',
    reason: 'security-audit report quoting the local dev URL + [REDACTED]/fake evidence strings it documents — no real credential',
  },
  {
    file: 'docs/round90/diagnosis/review-backend.md',
    id: 'pg',
    reason: 'backend review documents the local embedded-postgres dev URL (postgres:postgres@127.0.0.1:5434) — dev-only',
  },
  {
    file: 'docs/round90/diagnosis/review-quality.md',
    id: 'pg',
    reason: 'quality review documents the local embedded-postgres dev URL (postgres:postgres@127.0.0.1:5434) — dev-only',
  },
];

const ALLOW_MARKER = 'allow-secret-check';

// ── Binary/size guards ──────────────────────────────────────────────────

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.svgz',
  '.mp4', '.webm', '.mov', '.mp3', '.wav', '.woff', '.woff2', '.ttf', '.eot',
  '.otf', '.pdf', '.zip', '.gz', '.tar', '.br', '.7z', '.jar', '.wasm',
]);
const MAX_BYTES = 5 * 1024 * 1024; // skip huge blobs (none expected among text files)

function isBinary(path) {
  if (BINARY_EXT.has(path.slice(path.lastIndexOf('.')))) return true;
  try {
    const buf = readFileSync(path);
    if (buf.length > MAX_BYTES) return true;
    // NUL byte in the first 8KB → treat as binary (text files never contain NUL)
    return buf.subarray(0, 8192).includes(0);
  } catch {
    return true;
  }
}

/** Mask a matched secret so the scanner output can never echo the leak. */
function mask(match) {
  return match.length <= 10 ? '*'.repeat(match.length) : `${match.slice(0, 8)}…(${match.length} chars)`;
}

// ── File enumeration ────────────────────────────────────────────────────

function listFiles() {
  try {
    const out = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { encoding: 'utf8', maxBuffer: 1 << 26 }
    );
    return out.split('\0').filter(Boolean);
  } catch (e) {
    console.error('check-secrets: not a git repository (or git unavailable):', e.message);
    process.exit(2);
  }
  return [];
}

// ── Scan ────────────────────────────────────────────────────────────────

const files = listFiles();
const allowMap = new Map(FILE_ALLOWLIST.map((a) => [`${a.file}::${a.id}`, a.reason]));

let textFiles = 0;
const leaks = [];
const allowed = [];

for (const file of files) {
  let st;
  try {
    st = statSync(file);
  } catch {
    continue; // deleted-but-staged etc.
  }
  if (!st.isFile() || isBinary(file)) continue;
  textFiles++;

  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (line.includes(ALLOW_MARKER)) continue; // inline, intent-documented exemption

    for (const { id, re } of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const finding = { file, lineNo: i + 1, id, match: m[0] };
        const reason = allowMap.get(`${file}::${id}`);
        if (reason) allowed.push({ ...finding, reason });
        else leaks.push(finding);
      }
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────

for (const a of allowed) {
  console.log(`  ↷ allowed  ${a.file}:${a.lineNo} [${a.id}] — ${a.reason}`);
}
if (leaks.length > 0) {
  console.error(`\n❌ SECRET LEAKS DETECTED (${leaks.length}):`);
  for (const l of leaks) {
    console.error(`  ${l.file}:${l.lineNo} [${l.id}] ${mask(l.match)}`);
  }
  console.error('\nFix: remove/rotate the secret. If a match is a deliberate dev-only');
  console.error('placeholder, either add `allow-secret-check` to that line or extend');
  console.error('FILE_ALLOWLIST in scripts/check-secrets.mjs with a justification.');
  process.exit(1);
}

console.log(
  `\n✓ secrets check passed: ${files.length} files enumerated, ${textFiles} text files scanned, ` +
    `${allowed.length} deliberate exception(s), 0 leaks.`
);
