/**
 * round92-B3 (agent 2-c) — verb-level exemptions in scripts/check-api-auth.mjs.
 *
 * The guard used to exempt `/api/restaurants` at FILE level while only its
 * POST (public self-registration, rate-limited 5/min) is actually public —
 * its GET is session-gated (requirePermission('VIEW_ANALYTICS'), route:64).
 * A future regression dropping the GET gate would have passed silently.
 *
 * The entry moved to VERB_PUBLIC_ALLOWLIST (POST only). These tests import
 * the script's PURE decision core (module import under vitest runs no CLI
 * side effects — the scan is argv-guarded) and pin:
 *   - the B3 move itself (no file-level exemption, POST still allowlisted)
 *   - an ungated GET on /api/restaurants is now flagged (the masked class)
 *   - the pre-existing verb entries (orders POST, loyalty/referral GET,
 *     reviews POST) keep passing
 *   - the brace-matching extractor returns full handler bodies
 * The live repo scan (65 routes → PASS) runs separately via
 * `node scripts/check-api-auth.mjs` in CI/local gates.
 */
import { describe, it, expect } from 'vitest';
import {
  findUngatedHandlers,
  isRouteExempt,
  extractHandlerBodies,
  PUBLIC_ALLOWLIST,
  VERB_PUBLIC_ALLOWLIST,
} from '../../scripts/check-api-auth.mjs';

describe('round92-B3 — verb-level allowlist decision core', () => {
  it('/api/restaurants is NO LONGER file-level public (the regression mask is gone)', () => {
    expect(PUBLIC_ALLOWLIST.has('/api/restaurants')).toBe(false);
  });

  it('/api/restaurants POST stays verb-allowlisted (public self-registration)', () => {
    expect(VERB_PUBLIC_ALLOWLIST.get('/api/restaurants')).toEqual(new Set(['POST']));
  });

  it('an ungated GET on /api/restaurants is now FLAGGED — the exact class the file-level exemption masked', () => {
    const violations = findUngatedHandlers('/api/restaurants', [
      { verb: 'GET', body: 'const rows = await listEverything(); return json(rows);' },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].verb).toBe('GET');
  });

  it('the real /api/restaurants GET shape (requirePermission) passes', () => {
    const violations = findUngatedHandlers('/api/restaurants', [
      { verb: 'GET', body: "const auth = await requirePermission('VIEW_ANALYTICS'); if (!auth.authorized) return err();" },
    ]);
    expect(violations).toHaveLength(0);
  });

  it('the allowlisted POST verb passes even with no auth marker (public branch)', () => {
    const violations = findUngatedHandlers('/api/restaurants', [
      { verb: 'POST', body: 'const ip = getClientIp(request); await limiter(ip);' },
    ]);
    expect(violations).toHaveLength(0);
  });

  it('an ungated PUT on /api/restaurants would also be flagged (no verb is exempt beyond POST)', () => {
    const violations = findUngatedHandlers('/api/restaurants', [{ verb: 'PUT', body: 'await update();' }]);
    expect(violations).toHaveLength(1);
  });
});

describe('round92-B3 — pre-existing verb entries unchanged', () => {
  it('/api/orders POST allowlisted, GET must be gated', () => {
    expect(VERB_PUBLIC_ALLOWLIST.get('/api/orders')).toEqual(new Set(['POST']));
    expect(findUngatedHandlers('/api/orders', [{ verb: 'POST', body: 'await create();' }])).toHaveLength(0);
    expect(findUngatedHandlers('/api/orders', [{ verb: 'GET', body: 'await list();' }])).toHaveLength(1);
    expect(findUngatedHandlers('/api/orders', [{ verb: 'GET', body: 'await requireAuth();' }])).toHaveLength(0);
  });

  it('/api/loyalty/referral GET allowlisted, POST must be gated', () => {
    expect(VERB_PUBLIC_ALLOWLIST.get('/api/loyalty/referral')).toEqual(new Set(['GET']));
    expect(findUngatedHandlers('/api/loyalty/referral', [{ verb: 'GET', body: 'await lookup();' }])).toHaveLength(0);
    expect(findUngatedHandlers('/api/loyalty/referral', [{ verb: 'POST', body: 'await create();' }])).toHaveLength(1);
  });

  it('/api/items/[id]/reviews POST allowlisted', () => {
    expect(VERB_PUBLIC_ALLOWLIST.get('/api/items/[id]/reviews')).toEqual(new Set(['POST']));
  });

  it('whole-file public endpoints are still exempt (health/plans/login)', () => {
    expect(isRouteExempt('/api/health')).toBe(true);
    expect(isRouteExempt('/api/plans')).toBe(true);
    expect(isRouteExempt('/api/auth/login')).toBe(true);
    expect(isRouteExempt('/api/restaurants')).toBe(false);
  });
});

describe('round92-B3 — extractHandlerBodies brace matcher', () => {
  const SRC = `export async function GET() {
  const auth = await requireAuth();
  if (!auth) { return 401; }
}
export async function POST(r) {
  const body = { a: { b: 1 } };
  return 201;
}
`;

  it('finds both handlers with FULL bodies (nested braces included)', () => {
    const bodies = extractHandlerBodies(SRC);
    expect(bodies.map((b: { verb: string }) => b.verb)).toEqual(['GET', 'POST']);
    expect(bodies[0].body).toContain('requireAuth(');
    expect(bodies[0].body).toContain('if (!auth) { return 401; }');
    expect(bodies[1].body).toContain('{ a: { b: 1 } }');
  });

  it('handler bodies drive the marker scan (GET gated, POST not)', () => {
    const bodies = extractHandlerBodies(SRC);
    expect(findUngatedHandlers('/api/some/route', bodies)).toEqual([
      expect.objectContaining({ verb: 'POST' }),
    ]);
  });
});
