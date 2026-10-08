import { create } from "zustand";
import { loginRequest, logoutRequest, meRequest } from "@/services/auth/auth-service";
import { setStoredToken, getStoredToken, registerUnauthorizedHandler } from "@/services/api/client";
import type { AuthUser } from "@/types";
import { ApiError } from "@/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (u: string, p: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null, token: null, status: "idle", error: null,
  bootstrap: async () => {
    set({ status: "loading", error: null });
    const token = await getStoredToken();
    if (!token) { set({ status: "unauthenticated", user: null, token: null }); return; }
    try {
      const me = await meRequest();
      if (!me || !me.authenticated) {
        await setStoredToken(null);
        set({ status: "unauthenticated", user: null, token: null });
        return;
      }
      set({
        status: "authenticated", token,
        // r102-M13: identity comes from the /me row (id/username/name are now
        // served by the endpoint). Fabricating {id:0, username:""} is gone —
        // greetings fall back to a role label instead of a fake empty user.
        user: {
          id: me.id ?? 0,
          username: me.username ?? "",
          name: me.name ?? "",
          role: me.role, restaurantId: me.restaurantId,
          subscriptionStatus: me.subscriptionStatus, permissions: me.permissions,
        },
      });
    } catch (e) {
      // r103-N1: the token is destroyed ONLY on a definitive rejection —
      // a server-responded 401 (session expired) or an authenticated:false body.
      // A network failure / timeout / 5xx at cold launch keeps the token: the
      // user lands on the public stack (optionally with the error surfaced)
      // and the next launch or manual login recovers without losing the
      // stored session. Wiping it here logged owners out on every flaky
      // network — the exact failure mode this fix closes.
      const definitiveLogout = e instanceof ApiError && e.status === 401;
      if (definitiveLogout) {
        await setStoredToken(null);
        set({ status: "unauthenticated", user: null, token: null });
        return;
      }
      const msg = e instanceof ApiError ? e.message : "تعذّر الاتصال بالخادم";
      set({ status: "unauthenticated", user: null, error: msg });
    }
  },
  login: async (username, password) => {
    set({ status: "loading", error: null });
    try {
      const { user, sessionToken } = await loginRequest(username, password);
      await setStoredToken(sessionToken);
      set({ status: "authenticated", user, token: sessionToken });
      return { ok: true as const };
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "تعذّر تسجيل الدخول";
      set({ status: "unauthenticated", error: msg, user: null, token: null });
      return { ok: false as const, error: msg };
    }
  },
  logout: async () => {
    // r119-B2-M (S6 P2-1): LOCAL session teardown FIRST — zustand state reset
    // (instant: RootNavigator lands on the public stack this frame) and the
    // SecureStore token wipe both happen BEFORE any network round-trip, so an
    // offline device or a request hung up to the 15s client timeout can never
    // leave the user logged in. The old order (server call → then reset) also
    // relied on logoutRequest's internal catch alone — an unexpected rejection
    // would have skipped the local wipe entirely AND surfaced as an unhandled
    // promise at the four onPress={logout} call sites.
    set({ user: null, token: null, status: "unauthenticated", error: null });
    await setStoredToken(null);
    // Best-effort server call, last and guarded (never rejects — see
    // auth-service.ts: it revokes the session cookie only, a no-op for the
    // mobile Bearer session today, kept for contract parity).
    await logoutRequest().catch(() => {});
  },
  clearError: () => set({ error: null }),
}));

// r102-M1: mid-session expiry (server returned 401 on a request that carried our
// Bearer token) resets the whole app to the public stack exactly once, instead
// of every screen surfacing a raw unauthorized error.
registerUnauthorizedHandler(() => {
  useAuth.setState({ user: null, token: null, status: "unauthenticated", error: null });
});
