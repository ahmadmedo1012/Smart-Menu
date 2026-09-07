/**
 * Unified client-IP extraction — Round 91 D1/F1+F2+F4+F5.
 *
 * WHY THIS EXISTS (docs/round90-closure-report.md deferred item #1):
 *   16 inline extraction sites disagreed on priority (12 read x-real-ip first,
 *   4 read x-forwarded-for[0] first), all took the FIRST XFF entry, and none
 *   canonicalized or validated. On any non-Vercel deployment (the repo ships
 *   `output: "standalone"` + a reverse-proxy example), a client can rotate
 *   spoofed X-Real-Ip / X-Forwarded-For values to mint fresh rate-limit
 *   budgets — including the account-lockout budget. On Vercel today the
 *   platform overwrites both headers, so prod is safe BY ACCIDENT, not by
 *   design (D1 proved this live: single 429s were egress rotation, not
 *   relaxation).
 *
 * TRUST MODEL (explicit, one place):
 *   - Vercel (process.env.VERCEL set): headers are platform-controlled.
 *     x-real-ip wins; otherwise the LAST XFF entry (the hop Vercel appended).
 *   - Non-Vercel: TRUST_PROXY_DEPTH (default 1 — local dev + CI parity).
 *     depth ≥ 1 → honor x-real-ip and the XFF entry `depth` hops from the END
 *     (a proxy that appends the connecting IP puts the real client LAST).
 *     depth = 0 → trust NO client-supplied header: everything is "unknown"
 *     (fail-closed; standalone deployers behind no trusted proxy MUST set 0 —
 *     a shared "unknown" bucket is stricter than a spoofable one).
 *
 *   - Canonicalization (D1/F5): lowercase, strip IPv6 brackets, strip the
 *     ::ffff: IPv4-mapped prefix so one client cannot occupy two buckets.
 *   - Validation (D1/F11): anything that is not a plausible IPv4/IPv6 literal
 *     collapses to "unknown" — never persisted raw, never a key-injection
 *     vector (rate-limit keys are `ip:scope` composites).
 *
 * NOTE: src/lib/referral-conversion.ts intentionally keeps its OWN first-hop
 * fingerprint (round-77 claim↔attach matching across proxy chains). That is
 * a session-fingerprint semantic, not a rate-limit identity — do not migrate
 * it to this helper.
 */

const IPV4_SHAPE = /^(\d{1,3}\.){3}\d{1,3}$/;
// Permissive IPv6: hex groups + colons (+ optional embedded IPv4 tail).
const IPV6 = /^([0-9a-f]{0,4}:){1,7}[0-9a-f]{0,4}(\.[0-9]{1,3}){0,1}$/;

function isIpv4(ip: string): boolean {
        if (!IPV4_SHAPE.test(ip)) return false;
        return ip.split('.').every((o) => {
                const n = Number(o);
                return n <= 255 && (o.length > 1 ? !o.startsWith('0') || n === 0 : true);
        });
}

function canonicalizeIp(raw: string): string {
        let ip = raw.trim().toLowerCase();
        // [2001:db8::1] → 2001:db8::1
        if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
        // ::ffff:1.2.3.4 → 1.2.3.4 (IPv4-mapped)
        if (ip.startsWith('::ffff:') && isIpv4(ip.slice(7))) ip = ip.slice(7);
        // 0:0:0:0:0:ffff:1.2.3.4 → 1.2.3.4 (long-form mapped)
        if (ip.startsWith('0:0:0:0:0:ffff:') && isIpv4(ip.slice(15))) ip = ip.slice(15);
        if (!isIpv4(ip) && !IPV6.test(ip)) return 'unknown';
        return ip;
}

function isVercel(): boolean {
        return Boolean(process.env.VERCEL);
}

function trustDepth(): number {
        const raw = Number(process.env.TRUST_PROXY_DEPTH);
        return Number.isInteger(raw) && raw >= 0 ? raw : 1;
}

function xffEntry(headers: Headers, hopsFromEnd: number): string | null {
        const header = headers.get('x-forwarded-for');
        if (!header) return null;
        const entries = header
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        if (entries.length === 0) return null;
        const idx = Math.max(0, entries.length - Math.max(1, hopsFromEnd));
        return entries[idx] ?? null;
}

/**
 * The single source of truth for client identity in rate limiting and audit
 * logging. Returns a canonical, validated IP literal or "unknown".
 */
export function getClientIp(request: Request | { headers: Headers }): string {
        const headers = request.headers;
        if (isVercel()) {
                // Platform-controlled: x-real-ip (Vercel sets it to the real
                // client), else the LAST XFF entry Vercel appended.
                const realIp = headers.get('x-real-ip');
                if (realIp) return canonicalizeIp(realIp);
                const last = xffEntry(headers, 1);
                if (last) return canonicalizeIp(last);
                return 'unknown';
        }
        const depth = trustDepth();
        if (depth === 0) return 'unknown'; // fail-closed: no header trusted
        const realIp = headers.get('x-real-ip');
        if (realIp) return canonicalizeIp(realIp);
        const entry = xffEntry(headers, depth);
        if (entry) return canonicalizeIp(entry);
        return 'unknown';
}

// Pure exports for unit tests.
export const __testables = { canonicalizeIp, xffEntry, isVercel, trustDepth };
