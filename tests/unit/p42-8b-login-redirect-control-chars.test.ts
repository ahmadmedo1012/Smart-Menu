// P42-8b — open-redirect control-character bypass of the login redirect guard.
//
// The r118-A4-P3 guard (both twins: login/page.tsx `safeRedirectTarget` +
// LoginForm.tsx `safeRedirect`) rejects '//evil.com' and '/\evil.com' — the
// spellings WHERE the dangerous character sits at value[0]/value[1]. But the
// WHATWG URL parser used by browsers (and Node) STRIPS ASCII tab/LF/CR from
// the value BEFORE the path grammar runs, so '/\t/evil.com' (raw %09 arrives
// decoded from the ?redirect= query) passes all three checks — second char is
// a tab, not '/' or '\' — and then parses as '//evil.com' in BOTH sinks:
//   - server: `redirect(target)` puts the raw value in the Location header →
//     the browser strips the tab → network-path redirect to evil.com;
//   - client: `window.location.replace(target)` → same stripping, same origin.
//
// The fix (P42-8b) rejects ANY control char (C0 + DEL) in the value — a valid
// same-origin path can never carry one (the URL serializer percent-encodes
// them), so no legitimate redirect target changes behavior. These tests pin:
//   1. the WHATWG semantics that make the bypass real (spec proof, so a future
//      editor can't "simplify" the guard back);
//   2. the source contract — BOTH guards carry the control-char rejection on
//      the same `if` as the r118 checks, in the same order, byte-mirrored;
//   3. the family invariants — the guards stay mirrors of each other and the
//      owner-scoping (owner may only land on /owner*) is untouched.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

const BASE = 'https://menu.smart-link.ly';

/** The exact guard line both twins must contain (byte-mirrored family law). */
const GUARD_LINE =
        "if (!value || /[\\x00-\\x1f\\x7f]/.test(value) || !value.startsWith('/') || value.startsWith('//') || value[1] === '\\\\') return null;";

describe('P42-8b — the WHATWG tab/LF/CR stripping that motivates the guard', () => {
        it('PROOF: "/\\t/evil.com" (tab at value[1]) parses CROSS-ORIGIN even though it starts with a single "/"', () => {
                // This is the engine of the bypass — pinned so the guard's
                // control-char clause can never look redundant.
                const u = new URL('/\t/evil.com', BASE);
                expect(u.origin).not.toBe(BASE);
                expect(u.origin).toBe('https://evil.com');
        });

        it('PROOF: the old three checks (pre-P42-8b guard) ACCEPTED that spelling', () => {
                // The pre-fix guard shape, frozen here: if a refactor removes
                // the control-char clause, this reconstructs the hole live.
                const preFixGuard = (value: string | null) =>
                        !value || !value.startsWith('/') || value.startsWith('//') || value[1] === '\\'
                                ? null
                                : value;
                const attack = '/\t/evil.com';
                // …and the attack URL-parses cross-origin (the sink danger):
                expect(preFixGuard(attack)).toBe(attack);
                expect(new URL(preFixGuard(attack)!, BASE).origin).toBe('https://evil.com');
        });

        it('same proof for the LF and CR spellings (the parser strips all of \\t \\n \\r)', () => {
                for (const ch of ['\n', '\r']) {
                        const attack = `/${ch}/evil.com`;
                        expect(new URL(attack, BASE).origin).toBe('https://evil.com');
                }
        });

        it('legitimate same-origin targets are NOT control-char carriers (any URL-parsed pathname already lost them)', () => {
                // Why rejecting control chars can't break a real target: the
                // two producers of the param are `request.nextUrl.pathname`
                // (proxy) and `window.location.pathname + search` (the 401
                // seam) — both come OUT of a URL parser, which has already
                // stripped tab/LF/CR and percent-encoded the rest. A value
                // that still carries a raw control char was never a parsed
                // pathname — it is attacker-crafted input.
                const parsed = new URL('https://menu.smart-link.ly/owner/settings?tab=x', BASE);
                expect(/[\x00-\x1f\x7f]/.test(parsed.pathname)).toBe(false);
                expect(/[\x00-\x1f\x7f]/.test(parsed.pathname + parsed.search)).toBe(false);
                // and a legitimately-encoded %09 stays a SAFE same-origin path
                // (percent-encoded is not raw — the guard must still accept it):
                const encoded = new URL('/owner/settings%09x', BASE);
                expect(/[\x00-\x1f\x7f]/.test('/owner/settings%09x')).toBe(false);
                expect(encoded.origin).toBe(BASE);
        });
});

describe('P42-8b — source contracts (both guard twins hardened, byte-mirrored)', () => {
        it('login/page.tsx safeRedirectTarget rejects control chars on the same if as the r118 checks', () => {
                const src = read('src/app/(protected)/login/page.tsx');
                expect(src).toContain(GUARD_LINE);
                // the rejection runs BEFORE the value is trusted anywhere:
                // the very next statement is the passthrough return
                expect(src).toContain(GUARD_LINE + '\n        return value;');
        });

        it('LoginForm.tsx safeRedirect is the byte-mirrored twin (family law: same guard, both ends)', () => {
                const src = read('src/app/(protected)/login/LoginForm.tsx');
                expect(src).toContain(GUARD_LINE);
                expect(src).toContain(GUARD_LINE + '\n        return value;');
        });

        it('the r118-A4-P3 semantics survive: backslash spelling and // are still rejected first-class', () => {
                const page = read('src/app/(protected)/login/page.tsx');
                const form = read('src/app/(protected)/login/LoginForm.tsx');
                for (const src of [page, form]) {
                        expect(src).toContain("value.startsWith('//')");
                        expect(src).toContain("value[1] === '\\\\'");
                }
        });

        it('owner scoping is untouched: the owner may only land on /owner* targets', () => {
                const page = read('src/app/(protected)/login/page.tsx');
                expect(page).toContain("safe?.startsWith('/owner')");
                const form = read('src/app/(protected)/login/LoginForm.tsx');
                expect(form).toContain("rawRedirect.startsWith('/owner')");
        });

        it('the redirect param reaches the guard from BOTH producers without extra trust (proxy + 401 seam)', () => {
                // proxy: PROTECTED_ROOTS → /login?redirect=<pathname>
                const proxy = read('src/proxy.ts');
                expect(proxy).toContain("login.searchParams.set('redirect', pathname)");
                // W5 401 seam: /login?expired=1&redirect=<encodeURIComponent(current)>
                const seam = read('src/lib/csrf-client.ts');
                expect(seam).toContain('window.location.replace(`/login?expired=1&redirect=${encodeURIComponent(current)}`)');
        });
});
