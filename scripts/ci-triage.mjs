#!/usr/bin/env node
/**
 * r118-A8-P1 — CI triage classifier (used by .github/workflows/ci.yml).
 *
 * The recurring self-cancel incident (r112/r113): workflow-level concurrency
 * killed the DEFINITIVE run of a code commit whenever a docs-only push landed
 * minutes later. This script classifies a push/PR as code vs docs-only via the
 * GitHub compare API (no checkout, no history fetch — the runner's builtin
 * node + the workflow GITHUB_TOKEN are enough).
 *
 * Contract (GitHub Actions):
 *   - reads: GH_TOKEN, BASE (PR base sha or push "before" sha), GITHUB_REPOSITORY,
 *     GITHUB_SHA, GITHUB_EVENT_NAME, GITHUB_OUTPUT
 *   - writes: `code=true|false` to $GITHUB_OUTPUT
 *   - FAIL-OPEN toward `code=true` (run the heavy jobs) on ANY doubt: unusable
 *     base (force-push, first push, workflow_dispatch), API failure, rate
 *     limit, truncated diff. Skipping CI is the only dangerous outcome, so it
 *     must be provable.
 *
 * Docs-only = every changed file is under docs/ OR ends with .md (any depth).
 * Everything else — src/, prisma/, scripts/, tests/, .github/, package files,
 * configs — counts as code.
 */

import { appendFileSync } from "node:fs";

const DOCS_RE = /^docs\//;
const MARKDOWN_RE = /\.md$/;

function emit(code) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) appendFileSync(out, `code=${code ? "true" : "false"}\n`);
  console.log(`triage: code=${code ? "true" : "false"}`);
}

async function main() {
  const token = process.env.GH_TOKEN;
  const base = (process.env.BASE || "").trim();
  const repo = process.env.GITHUB_REPOSITORY;
  const head = process.env.GITHUB_SHA;
  const event = process.env.GITHUB_EVENT_NAME;

  // No usable base (manual dispatch, first push, force-push zeros) → run all.
  if (event === "workflow_dispatch" || !base || /^0+$/.test(base)) {
    console.log("triage: no usable base — running everything");
    return emit(true);
  }
  if (!token || !repo || !head) {
    console.log("triage: missing env — running everything");
    return emit(true);
  }

  const url = `https://api.github.com/repos/${repo}/compare/${base}...${head}`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (e) {
    console.log(`triage: compare fetch failed (${e.message}) — running everything`);
    return emit(true);
  }
  if (!res.ok) {
    console.log(`triage: compare API ${res.status} — running everything`);
    return emit(true);
  }
  const data = await res.json();
  const files = Array.isArray(data.files) ? data.files : [];
  // compare caps files at 300 per response; a bigger diff means "lots of
  // code" by construction — never skip on a truncated view.
  if (data.total_commits > 250 || files.length >= 300) {
    console.log("triage: large diff — running everything");
    return emit(true);
  }

  const nonDocs = files
    .map((f) => f.filename)
    .filter((name) => !DOCS_RE.test(name) && !MARKDOWN_RE.test(name));

  if (nonDocs.length > 0) {
    console.log(`triage: ${nonDocs.length} code file(s) changed, e.g. ${nonDocs.slice(0, 5).join(", ")}`);
    return emit(true);
  }
  console.log(`triage: docs-only push (${files.length} file(s)) — heavy jobs will be skipped`);
  return emit(false);
}

main().catch((e) => {
  console.log(`triage: unexpected error (${e.message}) — running everything`);
  emit(true);
});
