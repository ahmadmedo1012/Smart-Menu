import { api, setStoredToken, getStoredToken } from "../api/client";
import type { AuthUser, LoginResponse } from "@/types";

export interface MeResponse {
  authenticated: boolean;
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

export async function meRequest(): Promise<MeResponse | null> {
  try { return await api.get<MeResponse>("/api/auth/me"); } catch { return null; }
}

export async function logoutRequest(): Promise<void> {
  try { await api.post("/api/auth/logout", undefined); } catch {}
  await setStoredToken(null);
}

export async function bootstrapAuth(): Promise<AuthUser | null> {
  const token = await getStoredToken();
  if (!token) return null;
  const me = await meRequest();
  if (!me || !me.authenticated) { await setStoredToken(null); return null; }
  return {
    id: 0, username: "", name: "",
    role: me.role,
    restaurantId: me.restaurantId,
    subscriptionStatus: me.subscriptionStatus,
    permissions: me.permissions,
  };
}
