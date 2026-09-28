#!/usr/bin/env node
/**
 * check-git-author.mjs (r121-N-1) — commit-author tripwire for the
 * Smart-Menu repository. Zero dependencies (Node builtins + git).
 *
 * WHY (the r119 story, cost: days of blocked deploys)
 *   Vercel's git integration refuses to identify commit authors whose email
 *   is not associated with the GitHub account, and SILENTLY blocks every
 *   deployment they author. This exact class froze deploys in r114, r116 and
 *   r118 (5 commits, days of "why is production not updating?") before
 *   r119 root-caused it. The r119 fix lives in `.git/config` (repo-local
 *   user.email) — which is NOT versioned, so every fresh clone / new agent
 *   sandbox silently loses it (the sandbox global default is a non-account
 *   address).
 *
 * WHAT IT CHECKS
 *   `git config user.email` (repo-local, falling back to global) must be one
 *   of the ACCOUNT-ASSOCIATED addresses below. Anything else exits 1 with the
 *   story + the exact fix commands.
 *
 * WIRING (deliberately NOT a git hook)
 *   A checkable gate, not a hook: hooks are skipped with --no-verify, differ
 *   across contributors, and the CLAUDE.md session-resume protocol already
 *   names this script as the pre-commit step. Run it manually or from CI:
 *     node scripts/check-git-author.mjs
 *
 * EXIT: 0 = author email is account-associated; 1 = it is not (deploy-block
 * risk) — with the one-line fix printed.
 */
import { execFileSync } from 'node:child_process';

// The only emails associated with the GitHub account that Vercel deploys from
// (verified r119: both addresses appear across the last healthy commits).
// Add a new address here ONLY after confirming it is added to the GitHub
// account (Settings → Emails) — an unverified addition re-creates the block.
const ACCOUNT_ASSOCIATED_EMAILS = [
  'ahmadmedo1012@gmail.com',
  'ahmadmedo1012@users.noreply.github.com',
];

function gitConfigEmail() {
  // repo-local wins over global — the same resolution git itself uses.
  try {
    return execFileSync('git', ['config', 'user.email'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const email = gitConfigEmail();

if (!email) {
  console.error(
    '✗ git config user.email is NOT SET — every commit you make will be\n' +
      '  authored by a fallback identity Vercel cannot associate with the\n' +
      '  GitHub account, silently blocking all deployments (the r114/r116/r118\n' +
      '  incident class, root-caused r119). Fix:\n' +
      '    git config user.email "ahmadmedo1012@gmail.com"',
  );
  process.exit(1);
}

if (!ACCOUNT_ASSOCIATED_EMAILS.includes(email)) {
  console.error(
    `✗ git author email "${email}" is NOT associated with the GitHub account.\n` +
      '  Vercel git-integration will SILENTLY BLOCK every deployment authored\n' +
      '  by it (production keeps serving old code — this exact class cost days\n' +
      '  of frozen deploys in r114/r116/r118; root-caused r119). Fix:\n' +
      '    git config user.email "ahmadmedo1012@gmail.com"\n' +
      `  (accepted addresses: ${ACCOUNT_ASSOCIATED_EMAILS.join(' · ')})`,
  );
  process.exit(1);
}

console.log(`✓ git author email OK: ${email}`);
