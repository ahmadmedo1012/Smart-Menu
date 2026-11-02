"use client";
// ponytail: reads csrf-token cookie, adds X-CSRF-Token header to mutating fetches
import { CSRF_COOKIE, CSRF_HEADER } from "./csrf-shared";
/* r121 (G-1): كانت من "./csrf" — ذلك الملف يستورد secure-compare (node:crypto)
   للتحقق من جهة الخادم، فيدخل تجميع polyfills التشفير في رسم العميل ويشحن
   ~127KB-gz ميتة على كل مسار يستخدم csrfFetch. الورقة المشتركة تحمل الثابتين
   فقط — سلوك الشبكة/الأمان بلا أي تغيير. */

function getToken(): string {
  return (
    document.cookie
      .split("; ")
      .find((r) => r.startsWith(CSRF_COOKIE + "="))
      ?.split("=")[1] ?? ""
  );
}

/* ── P42-W5 (GAP-MENU-3): the central mid-session 401 seam ───────────────────
 * Family pattern, ported from the two siblings:
 *   · Smart-Order src/lib/client.ts (r132 A2-F5): logout keepalive + Arabic
 *     toast + window.location.replace("/login?expired=1", 1200ms beat), with a
 *     once-per-page-load flag so parallel failures (poll + mutation) collapse
 *     into ONE toast + ONE redirect.
 *   · SmartBot fb_dashboard csrf-client.ts (v15-E5 D4-H3): the /api/auth/*
 *     exclusions (a login-form 401 is WRONG CREDENTIALS, not a session kick),
 *     the on-/login loop guard, and the DYNAMIC toast import so sonner+lucide
 *     never ride into every chunk that merely imports csrfFetch.
 *
 * The gap this closes: 401 was handled page-by-page ONLY (owner/page.tsx:121
 * router.push, orders/page.tsx:94 + use-orders-polling.ts:49 full-reload —
 * all raw-fetch probes), while every OTHER csrfFetch/csrfJson consumer
 * (settings, menu, reviews, restaurants, loyalty, subscribe, and the whole
 * admin tree: users/telegram/subscriptions/system-events…) had NO
 * session-expiry journey — an expired session surfaced as the raw server
 * error while the page kept acting alive.
 *
 * The contract (mirrors the family exactly — see the siblings' comments):
 *  1. the FIRST 401 on a non-/api/auth/* request announces the expiry in
 *     Arabic (manual-dismiss error toast) — the user is informed BEFORE the
 *     page unloads; the 1200ms beat keeps the toast perceivable;
 *  2. the stale server session is dropped: fire-and-forget POST
 *     /api/auth/logout with keepalive (the request survives the navigation
 *     below; the cookie is httpOnly — only the server can clear it);
 *  3. window.location.replace("/login?expired=1&redirect=<current>") — a
 *     FULL page replace (the r97 ruling these trees already follow: a dead
 *     session must wipe ALL client state — store/cart/active-restaurant —
 *     not just swap the route), no Back-history entry for the dead page.
 *
 * Unsaved-work posture (documented family decision): both siblings redirect
 * immediately-ish with a toast — neither tries to keep the dead page's form
 * state alive, and neither does this seam. The `redirect` param is the
 * family's whole preservation story: it rides the login page's EXISTING
 * server-validated safeRedirectTarget contract (login/page.tsx) so the user
 * lands back on the SAME page after re-authenticating (the proxy already
 * sends unauthenticated PAGE navigations to /login?redirect=<pathname> —
 * proxy.ts; this seam extends the same contract to mid-session API 401s).
 * `expired=1` is the Smart-Order reason marker (inert for today's login
 * page; kept for parity).
 *
 * Idempotency (no double-redirect races): the once-per-page-load module flag
 * collapses 401 bursts into one toast + one timer; the page-level handlers
 * that already exist (raw fetch — never through csrfFetch) keep working and
 * simply win the navigation when they fire first (both destinations are
 * /login; the seam never fights them). csrfFetch still returns the Response
 * UNCHANGED — every caller's own !res.ok handling sees exactly what it
 * always did (Smart-Order keeps throwing its ApiError for the same reason).
 */
const SESSION_EXPIRED_TOAST_TITLE = 'انتهت الجلسة';
const SESSION_EXPIRED_TOAST_DESC = 'أعد تسجيل الدخول — سيتم تحويلك إلى صفحة الدخول الآن';
const SESSION_REDIRECT_DELAY_MS = 1200;

let sessionExpiryHandled = false;

function onLoginPage(): boolean {
  const p = window.location.pathname;
  return p === '/login' || p.startsWith('/login/') || p === '/register' || p.startsWith('/register/');
}

function handleSessionExpired(): void {
  if (sessionExpiryHandled) return;
  sessionExpiryHandled = true;
  // (2) drop the stale server session — raw fetch, NOT csrfFetch (the seam
  // must never re-enter itself), keepalive so it survives the navigation.
  fetch('/api/auth/logout', { method: 'POST', keepalive: true }).catch(() => {
    /* the logout best-effort — the redirect below still fires */
  });
  // (1) the readable beat — dynamic import (SmartBot guard): sonner + lucide
  // stay OUT of every chunk that merely imports csrfFetch; the toast must
  // never block the redirect.
  import('@/lib/premium-toast')
    .then(({ premiumToast }) =>
      premiumToast('error', SESSION_EXPIRED_TOAST_TITLE, SESSION_EXPIRED_TOAST_DESC),
    )
    .catch(() => {
      /* the toast is best-effort — the redirect below still fires */
    });
  // (3) the full-page replace after the beat — once per page load. Plain
  // setTimeout (the module is "use client" and the seam is window-guarded);
  // the dead page never enters Back history.
  const current = window.location.pathname + window.location.search;
  setTimeout(() => {
    window.location.replace(`/login?expired=1&redirect=${encodeURIComponent(current)}`);
  }, SESSION_REDIRECT_DELAY_MS);
}

/** The seam's URL predicate — a RequestInfo | URL → its path (SSR-safe). */
function requestPath(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.pathname;
  try {
    return new URL(input.url).pathname;
  } catch {
    return String(input);
  }
}

/** A 401 whose meaning is CALLER-LOCAL (wrong login credentials, logout…)
 *  — never a session kick. Every Smart-Menu auth endpoint lives under
 *  /api/auth/ (login · logout · me · register). */
function isLocalAuth401(path: string): boolean {
  return path.startsWith('/api/auth/');
}

export function csrfFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    init = {
      ...init,
      headers: {
        ...init?.headers,
        [CSRF_HEADER]: getToken(),
      },
    };
  }
  return fetch(input, init).then((res) => {
    // P42-W5 (GAP-MENU-3): the central mid-session 401 seam — see the block
    // comment above for the full family contract. SSR-safe (window guard);
    // /api/auth/* keeps its caller-local 401 meaning; never re-fires on the
    // login/register pages (loop guard); idempotent (once per page load).
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !isLocalAuth401(requestPath(input)) &&
      !onLoginPage()
    ) {
      handleSessionExpired();
    }
    return res;
  });
}

/**
 * round86-C1: csrfFetch + status/envelope checking in one call.
 *
 * csrfFetch is plain fetch — it does NOT throw on non-2xx, so handlers that
 * `await csrfFetch(...)` without checking `res.ok` toast success and mutate
 * local state even when the request was rejected (403 subscription-expired,
 * 422 validation…). This helper centralizes the correct pattern (the
 * ItemDialog one) so a rejected write always throws:
 *   - non-2xx → throws Error(body.error ?? HTTP status text)
 *   - 2xx     → returns the parsed JSON body
 *
 * P42-W5 note: a 401 here fires the seam inside csrfFetch (toast + login
 * redirect) AND STILL THROWS the server's error — the caller's catch sees
 * exactly the same Error it always did (the Smart-Order apiFetch contract).
 */
export async function csrfJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await csrfFetch(input, init);
  let body: (T & { error?: string }) | null = null;
  try {
    body = (await res.json()) as T & { error?: string };
  } catch {
    /* non-JSON body — fall through to the status check */
  }
  if (!res.ok) {
    const message =
      (body && typeof body.error === "string" && body.error) ||
      `تعذّر الطلب (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}
