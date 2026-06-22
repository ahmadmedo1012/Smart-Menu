"use client";
// ponytail: reads csrf-token cookie, adds X-CSRF-Token header to mutating fetches
import { CSRF_COOKIE, CSRF_HEADER } from "./csrf";

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
