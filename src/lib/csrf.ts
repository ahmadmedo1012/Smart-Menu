export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "x-csrf-token";

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function validateToken(
  headerValue: string | null | undefined,
  cookieValue: string | null | undefined,
): boolean {
  if (!headerValue || !cookieValue) return false;
  return headerValue === cookieValue;
}
