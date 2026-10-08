// API client — wraps fetch with Bearer auth + envelope parsing + Arabic error throwing.
//
// r102-M1: two production-grade gaps closed —
//   1) TIMEOUT: fetch previously had no AbortController; a hung request meant an
//      infinite spinner (no timeout, no retry) on flaky mobile networks.
//   2) 401 handling: an expired/revoked session surfaced as a raw error in every
//      screen. Now the stored token is cleared once and the auth store is flipped
//      so RootNavigator lands the user back on the public stack.

import * as SecureStore from "expo-secure-store";
import { ApiError, type ApiEnvelope, type PaginatedMeta } from "@/types";

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ?? "https://menu.smart-link.ly";

export const SESSION_TOKEN_KEY = "smart-menu-session-token";

/**
 * Registered by the auth store at module load (breaks the client ← auth-service
 * ← store import cycle). Called exactly once per dead-token 401 so the app
 * state resets instead of every screen handling it independently.
 */
let unauthorizedHandler: (() => void) | null = null;
export function registerUnauthorizedHandler(fn: () => void): void {
  unauthorizedHandler = fn;
}

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
  /** Per-request timeout override in ms (default 15s). */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;

/** r118-B3 (A6 P3-1): full result of a paginated GET — rows plus the page
 * math the plain envelope unwrapping used to discard (api.get returns only
 * `data`). `meta` is undefined on non-paginated endpoints. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginatedMeta | undefined;
}

async function apiFetchEnvelope<T>(path: string, init: Init = {}): Promise<{ data: T; meta: PaginatedMeta | undefined }> {
  const { body, skipAuth, mobileClient, timeoutMs, headers, ...rest } = init;
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: finalHeaders, body: payload, signal: controller.signal });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new ApiError("انتهت مهلة الاتصال — تحقق من الشبكة وحاول مجددًا", 0);
    }
    throw new ApiError("تعذّر الاتصال بالخادم — تحقق من اتصالك بالإنترنت", 0);
  } finally {
    clearTimeout(timer);
  }

  // Dead session (expired/revoked server-side): a 401 on a request that CARRIED
  // a Bearer token means the token is worthless. Clear it and reset auth state;
  // callers still receive the thrown ApiError for their own in-flight handling.
  if (res.status === 401 && token) {
    await setStoredToken(null);
    unauthorizedHandler?.();
  }

  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch {
    throw new ApiError(`تعذّر الاتصال بالخادم (${res.status})`, res.status, text.slice(0, 500));
  }

  const env = parsed as ApiEnvelope<T>;
  if (res.ok && env?.success) {
    return { data: env.data, meta: (env as { meta?: PaginatedMeta }).meta };
  }

  const errMsg = (env && !env.success && env.error) || `تعذّر الطلب (${res.status})`;
  throw new ApiError(errMsg, res.status, (env as { details?: unknown })?.details);
}

export async function apiFetch<T>(path: string, init: Init = {}): Promise<T> {
  return (await apiFetchEnvelope<T>(path, init)).data;
}

export const api = {
  get: <T>(path: string, init?: Init) => apiFetch<T>(path, { ...init, method: "GET" }),
  /** r118-B3: paginated list GET — rows + { total, page, pageSize, totalPages }
   * so screens can implement load-more against the API's `paginated()` shape. */
  getPaginated: <T>(path: string, init?: Init): Promise<PaginatedResult<T>> =>
    apiFetchEnvelope<T[]>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: Init) => apiFetch<T>(path, { ...init, method: "POST", body }),
  put: <T>(path: string, body?: unknown, init?: Init) => apiFetch<T>(path, { ...init, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, init?: Init) => apiFetch<T>(path, { ...init, method: "PATCH", body }),
  delete: <T>(path: string, init?: Init) => apiFetch<T>(path, { ...init, method: "DELETE" }),
};
