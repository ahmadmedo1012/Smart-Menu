// ponytail: CSRF infrastructure preserved for forward compatibility.
// csrfFetch() client helper still sends x-csrf-token header.
// Server-side validation (validateToken) is unused — SameSite=Lax provides CSRF protection.
export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "x-csrf-token";

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
