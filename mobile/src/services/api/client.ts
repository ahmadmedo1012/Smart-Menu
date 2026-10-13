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

async function apiFetchEnvelope<T>(path: string, init: Init = {}): Promise<{ data: T; meta: PaginatedMeta | undefined; extras?: Record<string, unknown> }> {
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

  // Phase 6 (P6-2-c): the envelope may carry EXTRAS — top-level keys the
  // web `paginated(data, total, page, pageSize, extras)` helper merges
  // alongside data/meta (e.g. /api/owner/reviews attaches `stats`). They
  // are captured here so typed owner endpoints can surface them.
  const env = parsed as ApiEnvelope<T> & Record<string, unknown>;
  if (res.ok && env?.success) {
    // (lint: the envelope's own success/error/details fields are read via the
    // guards above/below — only the unknown extras keys are consumed here.)
    const { success: _success, data, meta, error: _error, details: _details, ...extras } = env;
    return { data, meta: (meta as PaginatedMeta | undefined) ?? (env as { meta?: PaginatedMeta }).meta, extras: Object.keys(extras).length > 0 ? (extras as Record<string, unknown>) : undefined };
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

/* ── Phase 6 (P6-2-c): the OWNER API surface ────────────────────────────────
 * Typed twins of the web routes (src/app/api/**), so the owner screens
 * consume one contract instead of hand-rolled paths. Shapes mirror the web
 * handlers verbatim:
 *   · /api/owner/restaurants  (GET — list + _count categories/orders)
 *   · /api/owner/reviews      (GET — paginated + `stats` envelope extra)
 *   · /api/items/[id]/reviews (DELETE ?reviewId= — moderation)
 *   · /api/loyalty/stats      (GET — KPIs + tier/referral aggregates)
 *   · /api/categories         (GET ?restaurantId= — paginated + _count items)
 *   · /api/items              (GET ?categoryId= / POST / PUT/DELETE [id])
 */

export interface OwnerRestaurant {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { categories: number; orders: number };
  isPrimary: boolean;
}

/** GET /api/owner/restaurants — the owner's list (list-counts `_count`
 * categories/orders + the isPrimary link flag). */
export async function getOwnerRestaurants(): Promise<OwnerRestaurant[]> {
  return apiFetch<OwnerRestaurant[]>("/api/owner/restaurants", { method: "GET" });
}

/** POST /api/owner/restaurants — the web createSchema core (name + legal slug;
 * description optional). The server seeds 4 default categories + plan caps. */
export async function createOwnerRestaurant(draft: { name: string; slug: string; description?: string }): Promise<OwnerRestaurant> {
  return apiFetch<OwnerRestaurant>("/api/owner/restaurants", { method: "POST", body: draft });
}

/** PATCH /api/owner/restaurants/[id] — set this menu primary (the route clears
 * the owner's other links first). */
export async function setPrimaryOwnerRestaurant(restaurantId: number): Promise<void> {
  await apiFetch<unknown>(`/api/owner/restaurants/${restaurantId}`, { method: "PATCH", body: { isPrimary: true } });
}

/** DELETE /api/owner/restaurants/[id] — refuses the primary menu (web 400)
 * and menus with orders (web 409, non-super_admin). */
export async function deleteOwnerRestaurant(restaurantId: number): Promise<void> {
  await apiFetch<unknown>(`/api/owner/restaurants/${restaurantId}`, { method: "DELETE" });
}

export interface OwnerReview {
  id: number;
  rating: number;
  comment: string | null;
  customerName: string | null;
  customerPhone: string | null;
  menuItemId: number;
  createdAt: string;
  menuItem: { id: number; name: string; nameAr: string | null } | null;
}

/** /api/owner/reviews `stats` extra (round87-C5: server-side aggregates over
 *  the FULL tenant set — the client never recomputes them). */
export interface OwnerReviewsStats {
  total: number;
  avg: number;
  distribution: { star: number; count: number }[];
}

export async function getOwnerReviews(params: { page?: number; pageSize?: number; minRating?: number } = {}): Promise<{ data: OwnerReview[]; meta: PaginatedMeta; stats: OwnerReviewsStats }> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.minRating) qs.set("minRating", String(params.minRating));
  const res = await apiFetchEnvelope<OwnerReview[]>(`/api/owner/reviews${qs.size > 0 ? `?${qs}` : ""}`, { method: "GET" });
  const stats = (res.extras?.stats as OwnerReviewsStats | undefined) ?? { total: 0, avg: 0, distribution: [] };
  return { data: res.data, meta: res.meta ?? { total: 0, page: 1, pageSize: 0, totalPages: 0 }, stats };
}

/** Review moderation — the web r103-F5b contract (DELETE with ?reviewId). */
export async function deleteOwnerReview(menuItemId: number, reviewId: number): Promise<void> {
  await apiFetch<unknown>(`/api/items/${menuItemId}/reviews?reviewId=${reviewId}`, { method: "DELETE" });
}

export interface LoyaltyStats {
  totalLoyaltyCards: number;
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  topReferrers: { customerName: string; referralCount: number; rewardsGiven: number }[];
  tierDistribution: Record<string, number>;
  recentTransactions: { id: number; type: string; points: number; description: string | null; createdAt: string }[];
  totalRewardPoints: number;
  referralsByStatus: Record<string, number>;
  recentReferrals: {
    id: number; referredName: string; referredPhone: string; status: string;
    discountPercent: number; referrerRewardPct: number; createdAt: string;
    convertedAt: string | null; referrer: { customerName: string } | null;
  }[];
}

export async function getLoyaltyStats(): Promise<LoyaltyStats> {
  return apiFetch<LoyaltyStats>("/api/loyalty/stats", { method: "GET" });
}

export interface OwnerCategory {
  id: number;
  name: string;
  nameAr: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  restaurantId: number;
  _count: { items: number };
}

/** GET /api/categories?restaurantId= — the web owner-menu contract (paginated
 *  with _count items; pageSize=100 covers a full menu in one page). */
export async function getOwnerCategories(restaurantId: number): Promise<OwnerCategory[]> {
  return apiFetch<OwnerCategory[]>(`/api/categories?restaurantId=${restaurantId}&pageSize=100`, { method: "GET" });
}

export type OwnerItemStatus = "available" | "unavailable";

export interface OwnerItem {
  id: number;
  name: string;
  nameAr: string | null;
  description: string;
  price: number;
  discountedPrice: number | null;
  image: string | null;
  status: OwnerItemStatus;
  sortOrder: number;
  categoryId: number;
  isFeatured: boolean;
}

/** GET /api/items?categoryId= — the web owner-menu contract (owner sees all
 *  statuses; pageSize=100 covers a full category in one page). */
export async function getOwnerItems(categoryId: number): Promise<OwnerItem[]> {
  return apiFetch<OwnerItem[]>(`/api/items?categoryId=${categoryId}&pageSize=100`, { method: "GET" });
}

/** Availability toggle — PARTIAL PUT (the web updateSchema: omitted fields
 *  are never overwritten, so a status-only body is safe). */
export async function setOwnerItemAvailability(itemId: number, status: OwnerItemStatus): Promise<void> {
  await apiFetch<unknown>(`/api/items/${itemId}`, { method: "PUT", body: { status } });
}

export interface OwnerItemDraft {
  name: string;
  nameAr?: string | null;
  description?: string;
  price: number;
  discountedPrice?: number | null;
  status?: OwnerItemStatus;
  categoryId: number;
}

/** POST /api/items — the web createSchema core (name/price/categoryId +
 *  optional fields; modifier groups, images and showcase fields stay
 *  web-only this round — documented). */
export async function createOwnerItem(draft: OwnerItemDraft): Promise<OwnerItem> {
  return apiFetch<OwnerItem>("/api/items", { method: "POST", body: draft });
}

/** PUT /api/items/[id] — partial update (name/price/description/category). */
export async function updateOwnerItem(itemId: number, draft: Partial<OwnerItemDraft>): Promise<OwnerItem> {
  return apiFetch<OwnerItem>(`/api/items/${itemId}`, { method: "PUT", body: draft });
}

export async function deleteOwnerItem(itemId: number): Promise<void> {
  await apiFetch<unknown>(`/api/items/${itemId}`, { method: "DELETE" });
}
