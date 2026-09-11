import { api, setStoredToken, getStoredToken } from "../api/client";
import type { AuthUser, LoginResponse } from "@/types";
import { ApiError } from "@/types";

export interface MeResponse {
  authenticated: boolean;
  /** r102-M13: identity fields — the RN store hydrates a REAL user now
   * (the endpoint reads the row's id/username/name; absent on older deploys). */
  id?: number | null;
  username?: string;
  name?: string;
  role: AuthUser["role"];
  restaurantId: AuthUser["restaurantId"] | null;
  subscriptionStatus: AuthUser["subscriptionStatus"];
  permissions: AuthUser["permissions"];
  roleLabel?: string;
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  return api.post<LoginResponse>(
    "/api/auth/login",
    { username, password },
    { skipAuth: true, mobileClient: true },
  );
}

/**
 * r103-N1: meRequest used to swallow EVERY failure into null — the store's
 * bootstrap then treated "no /me" as "not authenticated" and WIPED the stored
 * token. A cold launch on a flaky network (or a slow /me hitting M1's new 15s
 * timeout) permanently logged the owner out. Now: the response resolves on 2xx
 * and errors PROPAGATE (ApiError carries .status) so bootstrap can distinguish
 * a definitive 401 from a transient network/server failure.
 */
export async function meRequest(): Promise<MeResponse> {
  return api.get<MeResponse>("/api/auth/me");
}

export async function logoutRequest(): Promise<void> {
  try { await api.post("/api/auth/logout", undefined); } catch {}
  await setStoredToken(null);
}

export async function bootstrapAuth(): Promise<AuthUser | null> {
  const token = await getStoredToken();
  if (!token) return null;
  try {
    const me = await meRequest();
    if (!me.authenticated) { await setStoredToken(null); return null; }
    return {
      id: me.id ?? 0,
      username: me.username ?? "",
      name: me.name ?? "",
      role: me.role,
      restaurantId: me.restaurantId,
      subscriptionStatus: me.subscriptionStatus,
      permissions: me.permissions,
    };
  } catch (e) {
    // r103-N1: ONLY a definitive server rejection (401) destroys the stored
    // session — network failures/timeouts/5xx keep it for the next attempt.
    if (e instanceof ApiError && e.status === 401) {
      await setStoredToken(null);
      return null;
    }
    throw e;
  }
}
