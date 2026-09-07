/**
 * round92 (agent 2-c, task 5) — /api/health commitSha: deploy determinism.
 *
 * The health endpoint used to report a static version ("0.1.0") — no way to
 * know WHICH commit production is actually serving. It now reports
 * `commitSha: VERCEL_GIT_COMMIT_SHA || GIT_COMMIT_SHA || null`.
 *
 * Pinned behaviors (vi.stubEnv per call — the route reads env inside GET):
 *   - no env set → commitSha is null (NEVER a fabricated sha)
 *   - VERCEL_GIT_COMMIT_SHA (Vercel injects it on every deploy) wins
 *   - GIT_COMMIT_SHA (manual/standalone fallback) used when Vercel's is absent
 *   - an empty-string Vercel var is falsy → falls through to the fallback
 *   - the rest of the envelope (status/db/latency) is unchanged — the
 *     existing polling-probes.test.ts health cases stay the contract
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockDbHealth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/db', () => ({ dbHealth: mockDbHealth }));

async function callHealth() {
        const { GET } = await import('@/app/api/health/route');
        return GET();
}

beforeEach(() => {
        vi.unstubAllEnvs();
        mockDbHealth.mockResolvedValue({ ok: true, latencyMs: 3 });
});

afterEach(() => {
        vi.unstubAllEnvs();
});

describe('GET /api/health — commitSha (round92 deploy determinism)', () => {
        it('no env set → commitSha is null — never a fabricated sha', async () => {
                const res = await callHealth();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.commitSha).toBeNull();
                // the rest of the envelope is untouched
                expect(json.status).toBe('ok');
                expect(json.db).toBe('connected');
                expect(json.dbLatencyMs).toBe(3);
        });

        it('VERCEL_GIT_COMMIT_SHA set → reported verbatim', async () => {
                vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '0429f11b92c0');

                const res = await callHealth();

                const json = await res.json();
                expect(json.commitSha).toBe('0429f11b92c0');
        });

        it('GIT_COMMIT_SHA (standalone fallback) reported when Vercel var is absent', async () => {
                vi.stubEnv('GIT_COMMIT_SHA', '77822fbc');

                const res = await callHealth();

                const json = await res.json();
                expect(json.commitSha).toBe('77822fbc');
        });

        it('both set → the Vercel deployment sha wins', async () => {
                vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'e0b0b1d0');
                vi.stubEnv('GIT_COMMIT_SHA', 'local-build');

                const res = await callHealth();

                const json = await res.json();
                expect(json.commitSha).toBe('e0b0b1d0');
        });

        it('empty-string Vercel var is falsy → falls through to GIT_COMMIT_SHA', async () => {
                vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
                vi.stubEnv('GIT_COMMIT_SHA', '77822fbc');

                const res = await callHealth();

                const json = await res.json();
                expect(json.commitSha).toBe('77822fbc');
        });

        it('degraded DB → 503 and commitSha still present (the probe answers even when the DB is down)', async () => {
                vi.stubEnv('GIT_COMMIT_SHA', 'abc1234');
                mockDbHealth.mockResolvedValue({ ok: false, latencyMs: 10001 });

                const res = await callHealth();

                expect(res.status).toBe(503);
                const json = await res.json();
                expect(json.status).toBe('degraded');
                expect(json.db).toBe('error');
                expect(json.commitSha).toBe('abc1234');
        });
});
