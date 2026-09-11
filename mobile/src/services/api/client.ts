// API client — wraps fetch with Bearer auth + envelope parsing + Arabic error throwing.

import * as SecureStore from "expo-secure-store";
import { ApiError, type ApiEnvelope } from "@/types";

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ?? "https://menu.smart-link.ly";

export const SESSION_TOKEN_KEY = "smart-menu-session-token";

export async function getStoredToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(SESSION_TOKEN_KEY); } catch { return null; }
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
  } else {
    try { await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY); } catch {}
  }
}

type Init = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  mobileClient?: boolean;
};

export async function apiFetch<T>(path: string, init: Init = {}): Promise<T> {
  const { body, skipAuth, mobileClient, headers, ...rest } = init;
  const token = skipAuth ? null : await getStoredToken();

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (mobileClient) finalHeaders["X-Client-Type"] = "mobile";

  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      payload = body;
    } else {
      finalHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...rest, headers: finalHeaders, body: payload });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch {
    throw new ApiError(`فشل الاتصال بالخادم (${res.status})`, res.status, text.slice(0, 500));
  }

  const env = parsed as ApiEnvelope<T>;
  if (res.ok && env?.success) return env.data;

  const errMsg = (env && !env.success && env.error) || `فشل الطلب (${res.status})`;
  throw new ApiError(errMsg, res.status, (env as { details?: unknown })?.details);
}

export const api = {
  get: <T>(path: string, init?: Init) => apiFetch<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: Init) => apiFetch<T>(path, { ...init, method: "POST", body }),
  put: <T>(path: string, body?: unknown, init?: Init) => apiFetch<T>(path, { ...init, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, init?: Init) => apiFetch<T>(path, { ...init, method: "PATCH", body }),
  delete: <T>(path: string, init?: Init) => apiFetch<T>(path, { ...init, method: "DELETE" }),
};
