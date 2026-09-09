/**
 * hash.ts — REAL-execution KDF contract (r97-X4 / fix [1]).
 *
 * Background: 13 unit files vi.mock('@/lib/hash') (route tests exercise flow,
 * not crypto) and auth.test.ts §1 covers the basics — but NO dedicated suite
 * owned the password-KDF contract end-to-end: the login-time transparent
 * rehash flow (legacy verify → rehash → v2 verify), the OWASP iteration
 * floor, and the parse-boundary rejections (iterations 0 / non-integer /
 * >10M) were all unguarded. This file runs the REAL pbkdf2 (no mocks).
 *
 * PERF: 600k iterations ≈ 200-600ms per hash — the suite is deliberately
 * small (5 tests, ≤3 heavy operations per test) so it costs ~2-3s total.
 * ITERATIONS is NOT lowered: we test the real thing.
 *
 * Module scheme (src/lib/hash.ts):
 *   v2   "iterations:salt:hash"  pbkdf2-sha512, 64-byte key, hex
 *   v1   "salt:hash"             legacy 100k iterations (login rehash path)
 *   auth flows (src/app/api/auth/login/route.ts:146-153): on successful login,
 *   needsRehash(user.password) → password: hashPassword(password) — legacy
 *   users are transparently upgraded on next login.
 */
import { describe, it, expect } from 'vitest';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { hashPassword, verifyHash, needsRehash, ITERATIONS } from '@/lib/hash';

const LEGACY_ITERATIONS = 100_000; // v1 scheme (mirrors src/lib/hash.ts)
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/** Build a legacy v1 "salt:hash" row with the module's own old scheme. */
function legacyHash(password: string, salt = randomBytes(32).toString('hex')): string {
        const hash = pbkdf2Sync(password, salt, LEGACY_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
        return `${salt}:${hash}`;
}

describe('hash.ts — real-execution KDF (pbkdf2 sha512)', () => {
        it('v2 roundtrip: hashPassword → verifyHash(true); format ties to ITERATIONS (OWASP ≥ 210k)', () => {
                const stored = hashPassword('correct-horse-battery-staple');
                const parts = stored.split(':');
                expect(parts).toHaveLength(3); // v2 "iterations:salt:hash"
                expect(Number(parts[0])).toBe(ITERATIONS); // format embeds the live config
                expect(parts[1]).toMatch(/^[0-9a-f]{64}$/); // 32-byte hex salt
                expect(parts[2]).toMatch(/^[0-9a-f]{128}$/); // 64-byte hex hash
                // OWASP 2023 PBKDF2 floor — a downgrade of ITERATIONS must fail here
                // consciously (update this bound only with an accepted security review).
                expect(ITERATIONS).toBeGreaterThanOrEqual(210_000);
                expect(verifyHash('correct-horse-battery-staple', stored)).toBe(true);
        });

        it('wrong password → false (timing-safe compare, never throws)', () => {
                const stored = hashPassword('real-password');
                expect(verifyHash('wrong-password', stored)).toBe(false);
                expect(verifyHash('', stored)).toBe(false);
        });

        it('legacy v1 "salt:hash" (100k) still verifies and is flagged for rehash', () => {
                const stored = legacyHash('legacy-password');
                // 2-part string → parsed as v1, verified with LEGACY_ITERATIONS
                expect(verifyHash('legacy-password', stored)).toBe(true);
                expect(verifyHash('wrong', stored)).toBe(false);
                // the login route's upgrade signal: weaker params → rehash on next login
                expect(needsRehash(stored)).toBe(true);
        });

        it('login-time transparent rehash flow: legacy verify → hashPassword → v2 verify + flag cleared', () => {
                // Mirrors src/app/api/auth/login/route.ts:146-153:
                //   valid = verifyHash(password, user.password)
                //   ... needsRehash(user.password) ? { password: hashPassword(password) }
                const legacyStored = legacyHash('stale-user-password');
                expect(verifyHash('stale-user-password', legacyStored)).toBe(true);
                expect(needsRehash(legacyStored)).toBe(true);

                const upgraded = hashPassword('stale-user-password'); // the login-route write
                expect(verifyHash('stale-user-password', upgraded)).toBe(true); // user still logs in
                expect(verifyHash('wrong', upgraded)).toBe(false);
                expect(needsRehash(upgraded)).toBe(false); // no re-hash on the NEXT login
        });

        it('malformed stored hashes: parse rejects before pbkdf2, verify false, needsRehash true (fail-safe)', () => {
                const salt = randomBytes(32).toString('hex');
                const hex64 = 'ab'.repeat(64);
                const invalid: Array<[string, string]> = [
                        ['empty', ''],
                        ['no separator', 'nonsense'],
                        ['non-numeric iterations (3-part)', 'a:b:c'],
                        ['iterations 0', `0:${salt}:${hex64}`],
                        ['iterations negative', `-5:${salt}:${hex64}`],
                        ['iterations non-integer', `1.5:${salt}:${hex64}`],
                        ['iterations above 10M cap', `10000001:${salt}:${hex64}`],
                        ['2-part with empty hash', `${salt}:`],
                ];
                for (const [label, stored] of invalid) {
                        // parseStored returns null → verifyHash never runs pbkdf2 (fails
                        // closed: no plaintext fallback) and needsRehash flags a rewrite.
                        expect(verifyHash('anything', stored), label).toBe(false);
                        expect(needsRehash(stored), label).toBe(true); // login rewrites garbage (fail-safe)
                }
                // Parsed-but-mismatched hash length: pbkdf2 runs, then the
                // timingSafeEqual length guard rejects — iterations 1 keeps it cheap.
                expect(verifyHash('anything', `1:${salt}:deadbeef`)).toBe(false);
        });
});
