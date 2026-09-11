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
      const msg = e instanceof ApiError ? e.message : "تعذر الاتصال بالخادم";
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
      const msg = e instanceof ApiError ? e.message : "فشل تسجيل الدخول";
      set({ status: "unauthenticated", error: msg, user: null, token: null });
      return { ok: false as const, error: msg };
    }
  },
  logout: async () => {
    await logoutRequest();
    set({ user: null, token: null, status: "unauthenticated", error: null });
  },
  clearError: () => set({ error: null }),
}));

// r102-M1: mid-session expiry (server returned 401 on a request that carried our
// Bearer token) resets the whole app to the public stack exactly once, instead
// of every screen surfacing a raw unauthorized error.
registerUnauthorizedHandler(() => {
  useAuth.setState({ user: null, token: null, status: "unauthenticated", error: null });
});
