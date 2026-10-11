/**
 * r143 (Phase-4 W1 D7) — install-pill dismissal memory (src/lib/install-prompt.ts).
 *
 * The floating «تثبيت التطبيق» pill had NO exit: no close control, no
 * persistence, reappearing every full page load at z-index 9999. The contract
 * pinned here:
 *  - the × control writes a dismissal timestamp (7-day cool-off, not a ban);
 *  - garbage/corrupt stored values count as NOT dismissed (fail visible —
 *    a broken storage entry must not permanently bury the install offer);
 *  - every localStorage access is guarded: private-mode browsers that throw
 *    must not crash the host page (write → swallowed, read → null).
 *
 * The vitest env is node-only (deliberate — see install-prompt.ts), so the
 * storage half installs a stub on globalThis instead of jsdom.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
        INSTALL_DISMISS_KEY,
        INSTALL_DISMISS_MS,
        isInstallDismissed,
        dismissInstallPrompt,
        readInstallDismissal,
} from '@/lib/install-prompt';

describe('isInstallDismissed — 7-day cool-off window', () => {
        const NOW = 1_800_000_000_000;
        const DAY = 24 * 60 * 60 * 1000;

        it('empty/null/undefined → not dismissed', () => {
                expect(isInstallDismissed(null, NOW)).toBe(false);
                expect(isInstallDismissed(undefined, NOW)).toBe(false);
                expect(isInstallDismissed('', NOW)).toBe(false);
        });

        it('dismissed within the window → dismissed (boundary-exact)', () => {
                expect(isInstallDismissed(String(NOW - 1000), NOW)).toBe(true);
                expect(isInstallDismissed(String(NOW - INSTALL_DISMISS_MS + 1), NOW)).toBe(true);
                // exactly 7 days old → window elapsed → visible again (cool-off, not a ban)
                expect(isInstallDismissed(String(NOW - INSTALL_DISMISS_MS), NOW)).toBe(false);
                expect(isInstallDismissed(String(NOW - 8 * DAY), NOW)).toBe(false);
        });

        it('future timestamps count as dismissed (clock skew fails safe)', () => {
                expect(isInstallDismissed(String(NOW + 60_000), NOW)).toBe(true);
        });

        it('garbage/zero/negative → NOT dismissed (fail visible)', () => {
                expect(isInstallDismissed('not-a-number', NOW)).toBe(false);
                expect(isInstallDismissed('NaN', NOW)).toBe(false);
                expect(isInstallDismissed('0', NOW)).toBe(false);
                expect(isInstallDismissed('-42', NOW)).toBe(false);
        });

        it('the window is ~7 days as briefed (Phase-4 W1 #3)', () => {
                expect(INSTALL_DISMISS_MS).toBe(7 * 24 * 60 * 60 * 1000);
        });
});

describe('dismissInstallPrompt / readInstallDismissal — guarded storage', () => {
        const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
        let backing = new Map<string, string>();

        function installStub(impl?: Partial<Storage>) {
                const stub: Storage = {
                        getItem: (k: string) => (impl?.getItem ? impl.getItem(k) : (backing.get(k) ?? null)),
                        setItem: (k: string, v: string) => {
                                if (impl?.setItem) return impl.setItem(k, v);
                                backing.set(k, v);
                        },
                        removeItem: (k: string) => void backing.delete(k),
                        clear: () => backing.clear(),
                        key: () => null,
                        get length() {
                                return backing.size;
                        },
                } as Storage;
                Object.defineProperty(globalThis, 'localStorage', { value: stub, configurable: true, writable: true });
        }

        beforeEach(() => {
                backing = new Map();
                if (desc) delete (globalThis as { localStorage?: unknown }).localStorage;
        });
        afterEach(() => {
                // restore the pristine node-env shape (undefined or the original descriptor)
                if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
                else delete (globalThis as { localStorage?: unknown }).localStorage;
        });

        it('dismiss writes the current timestamp under the canonical key', () => {
                installStub();
                dismissInstallPrompt(1_234_567_890);
                expect(backing.get(INSTALL_DISMISS_KEY)).toBe('1234567890');
                expect(readInstallDismissal()).toBe('1234567890');
        });

        it('read returns the stored value verbatim', () => {
                installStub();
                backing.set(INSTALL_DISMISS_KEY, '42');
                expect(readInstallDismissal()).toBe('42');
        });

        it('no localStorage at all never throws (write swallowed, read → null)', () => {
                expect((globalThis as { localStorage?: unknown }).localStorage).toBeUndefined();
                expect(() => dismissInstallPrompt(1)).not.toThrow();
                expect(readInstallDismissal()).toBeNull();
        });

        it('throwing storage never throws (private mode): write swallowed, read → null', () => {
                installStub({
                        getItem: () => {
                                throw new Error('SecurityError');
                        },
                        setItem: () => {
                                throw new Error('SecurityError');
                        },
                });
                expect(() => dismissInstallPrompt(1)).not.toThrow();
                expect(readInstallDismissal()).toBeNull();
        });
});
