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
  return fetch(input, init);
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
