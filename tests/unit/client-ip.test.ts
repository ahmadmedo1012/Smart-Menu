// Round 91 D1: unified client-IP extraction — trust model + canonicalization.
// Mirrors the R90-style isolated unit pattern (no DB, pure functions).
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getClientIp, __testables } from '@/lib/client-ip';

function makeReq(headers: Record<string, string>): Request {
        return new Request('http://localhost/api/probe', { headers });
}

describe('getClientIp — Vercel trust model', () => {
        beforeEach(() => {
                process.env.VERCEL = '1';
                delete process.env.TRUST_PROXY_DEPTH;
        });
        afterEach(() => {
                delete process.env.VERCEL;
        });

        it('x-real-ip wins on Vercel (platform-controlled)', () => {
                const ip = getClientIp(makeReq({ 'x-real-ip': '5.6.7.8', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }));
                expect(ip).toBe('5.6.7.8');
        });

        it('falls back to the LAST xff entry (the hop Vercel appended), ignoring spoofable first entries', () => {
                const ip = getClientIp(makeReq({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }));
                expect(ip).toBe('10.0.0.1');
        });

        it('no headers → unknown', () => {
                expect(getClientIp(makeReq({}))).toBe('unknown');
        });
});

describe('getClientIp — non-Vercel trust model', () => {
        beforeEach(() => {
                delete process.env.VERCEL;
        });
        afterEach(() => {
                delete process.env.TRUST_PROXY_DEPTH;
        });

        it('depth=0 (standalone behind nothing): NO header is trusted — fail closed', () => {
                process.env.TRUST_PROXY_DEPTH = '0';
                expect(getClientIp(makeReq({ 'x-real-ip': '5.6.7.8', 'x-forwarded-for': '1.2.3.4' }))).toBe('unknown');
        });

        it('default depth=1 honors x-real-ip (local dev / CI parity with seeded tests)', () => {
                delete process.env.TRUST_PROXY_DEPTH;
                expect(getClientIp(makeReq({ 'x-real-ip': '1.2.3.4' }))).toBe('1.2.3.4');
        });

        it('default depth=1 takes the LAST xff entry when x-real-ip is absent', () => {
                delete process.env.TRUST_PROXY_DEPTH;
                expect(getClientIp(makeReq({ 'x-forwarded-for': 'spoof.invalid, 3.4.5.6' }))).toBe('3.4.5.6');
        });

        it('depth=2 (two chained trusted proxies) takes the second-from-last entry', () => {
                process.env.TRUST_PROXY_DEPTH = '2';
                expect(getClientIp(makeReq({ 'x-forwarded-for': '9.9.9.9, 3.4.5.6, 10.0.0.1' }))).toBe('3.4.5.6');
        });
});

describe('getClientIp — canonicalization (D1/F5: one client, one bucket)', () => {
        beforeEach(() => {
                delete process.env.VERCEL;
        });
        afterEach(() => {
                delete process.env.TRUST_PROXY_DEPTH;
        });

        it('IPv4-mapped IPv6 ::ffff:1.2.3.4 merges with 1.2.3.4', () => {
                expect(__testables.canonicalizeIp('::ffff:1.2.3.4')).toBe('1.2.3.4');
        });

        it('long-form mapped 0:0:0:0:0:ffff:1.2.3.4 merges with 1.2.3.4', () => {
                expect(__testables.canonicalizeIp('0:0:0:0:0:ffff:1.2.3.4')).toBe('1.2.3.4');
        });

        it('bracketed IPv6 [2001:DB8::1] → 2001:db8::1 (lowercased, unbracketed)', () => {
                expect(__testables.canonicalizeIp('[2001:DB8::1]')).toBe('2001:db8::1');
        });

        it('garbage / injection strings collapse to unknown (never a key-injection vector)', () => {
                expect(__testables.canonicalizeIp('acct:admin')).toBe('unknown');
                expect(__testables.canonicalizeIp('${jndi:ldap://x}')).toBe('unknown');
                expect(__testables.canonicalizeIp('')).toBe('unknown');
        });

        it('plain IPv6 stays intact and lowercase', () => {
                expect(__testables.canonicalizeIp('2001:0DB8:ABCD::1')).toBe('2001:0db8:abcd::1');
        });

        it('overlong dotted-quad octets are rejected (999.999.999.999 not an IP)', () => {
                expect(__testables.canonicalizeIp('999.999.999.999')).toBe('unknown');
        });
});

// ── round92-B2 (agent 2-c): decision record — appended, existing cases above
// are untouched. These pin the CURRENT contract (default depth=1 off-Vercel)
// plus the operator opt-in semantics. The fail-closed DEFAULT flip was
// evaluated and DEFERRED: 8 suites / 18 tests outside the agent boundary
// (login-backstop rotation, limiter bucket keys in orders-create,
// loyalty-ip-cap, loyalty-referral, loyalty-stats, subscriptions-family,
// subscriptions-upgrade + the two default=1 cases above) depend on it.
// When the default is deliberately flipped later, THIS block failing is the
// designed tripwire — fix it in the same commit as the flip.
describe('round92-B2 — trust decision record + TRUST_PROXY_DEPTH parsing', () => {
        beforeEach(() => {
                delete process.env.VERCEL;
                delete process.env.TRUST_PROXY_DEPTH;
        });
        afterEach(() => {
                delete process.env.TRUST_PROXY_DEPTH;
                delete process.env.VERCEL;
        });

        it('current contract: unset TRUST_PROXY_DEPTH (non-Vercel) defaults to depth=1 — x-real-ip is honored', () => {
                expect(__testables.trustDepth()).toBe(1);
                expect(getClientIp(makeReq({ 'x-real-ip': '1.2.3.4' }))).toBe('1.2.3.4');
        });

        it('operator opt-in to fail-closed: TRUST_PROXY_DEPTH=0 → NO header trusted, everything collapses to unknown', () => {
                process.env.TRUST_PROXY_DEPTH = '0';
                expect(__testables.trustDepth()).toBe(0);
                expect(getClientIp(makeReq({ 'x-real-ip': '5.6.7.8', 'x-forwarded-for': '1.1.1.1' }))).toBe('unknown');
        });

        it('garbage TRUST_PROXY_DEPTH values (non-integer/negative) fall back to the documented default 1', () => {
                for (const garbage of ['abc', '-1', '1.5']) {
                        process.env.TRUST_PROXY_DEPTH = garbage;
                        expect(__testables.trustDepth(), `TRUST_PROXY_DEPTH=${JSON.stringify(garbage)}`).toBe(1);
                }
        });

        it('an EMPTY TRUST_PROXY_DEPTH parses as 0 (Number("")===0) — the SAFE direction: fail-closed, not fail-open', () => {
                process.env.TRUST_PROXY_DEPTH = '';
                expect(__testables.trustDepth()).toBe(0);
                expect(getClientIp(makeReq({ 'x-real-ip': '1.2.3.4' }))).toBe('unknown');
        });

        it('a valid explicit depth=2 survives parsing (chained trusted proxies)', () => {
                process.env.TRUST_PROXY_DEPTH = '2';
                expect(__testables.trustDepth()).toBe(2);
        });

        it('Vercel wins regardless of TRUST_PROXY_DEPTH: platform headers stay trusted even with depth=0', () => {
                process.env.VERCEL = '1';
                process.env.TRUST_PROXY_DEPTH = '0';
                expect(getClientIp(makeReq({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
        });
});
