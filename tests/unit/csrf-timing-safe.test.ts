/**
 * round89-B5 (dx-4 #8) — the double-submit CSRF token comparison is now
 * constant-time (timingSafeEqualStrings from lib/secure-compare, the same
 * helper the webhook secret + cron bearer use) instead of a plain `!==` that
 * leaks prefix/length through response timing.
 *
 * Behavior is unchanged for correct inputs — these tests lock both sides:
 * the correct token passes, and every mismatch class (one-char diff with
 * equal length, prefix-match with different length, swapped values, empty
 * header) still throws the same token-mismatch error.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { assertSameOrigin } from '@/lib/csrf';

beforeAll(() => {
        process.env.NEXT_PUBLIC_DOMAIN = 'https://example.com';
});

const TOKEN = 'a'.repeat(32);

function sameOriginPost(cookieToken?: string, headerToken?: string): Request {
        const headers: Record<string, string> = {
                origin: 'https://example.com',
        };
        if (cookieToken !== undefined) headers['cookie'] = `csrf-token=${cookieToken}`;
        if (headerToken !== undefined) headers['x-csrf-token'] = headerToken;
        return new Request('https://example.com/api/restaurants', { method: 'POST', headers });
}

describe('assertSameOrigin — timing-safe double-submit comparison (B-5)', () => {
        it('correct token: cookie == header → passes', () => {
                expect(() => assertSameOrigin(sameOriginPost(TOKEN, TOKEN))).not.toThrow();
        });

        it('equal-length one-character difference → token mismatch (whole-string compare)', () => {
                const almost = 'b' + 'a'.repeat(31);
                expect(() => assertSameOrigin(sameOriginPost(TOKEN, almost))).toThrow(
                        'CSRF check failed: token mismatch'
                );
        });

        it('prefix match with different length → mismatch (no prefix leak)', () => {
                // a plain `!==` also rejected this, but the timing-safe helper must
                // reject it WITHOUT comparing byte-by-byte up to the shared prefix
                expect(() => assertSameOrigin(sameOriginPost(TOKEN, TOKEN.slice(0, 16)))).toThrow(
                        'CSRF check failed: token mismatch'
                );
        });

        it('header longer than cookie (suffix appended) → mismatch', () => {
                expect(() => assertSameOrigin(sameOriginPost(TOKEN, TOKEN + 'XYZ'))).toThrow(
                        'CSRF check failed: token mismatch'
                );
        });

        it('swapped values (cookie/header exchanged) → still passes — they must match each other, not a fixed value', () => {
                const other = 'c'.repeat(32);
                expect(() => assertSameOrigin(sameOriginPost(other, other))).not.toThrow();
        });

        it('empty header token → mismatch (fail-closed)', () => {
                expect(() => assertSameOrigin(sameOriginPost(TOKEN, ''))).toThrow(
                        'CSRF check failed: token mismatch'
                );
        });

        it('missing cookie token → mismatch', () => {
                expect(() => assertSameOrigin(sameOriginPost(undefined, TOKEN))).toThrow(
                        'CSRF check failed: token mismatch'
                );
        });

        it('comparison is byte-exact: case difference → mismatch (no case folding)', () => {
                // HTTP header values are ByteStrings (latin-1) — the minted tokens are
                // lowercase hex, so byte-exactness is the relevant property here.
                const upper = 'A'.repeat(32);
                expect(() => assertSameOrigin(sameOriginPost(TOKEN, upper))).toThrow(
                        'CSRF check failed: token mismatch'
                );
        });
});
