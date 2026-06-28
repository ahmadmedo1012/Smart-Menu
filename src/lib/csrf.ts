export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "x-csrf-token";

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function validateCsrfToken(expected: string, token: string): boolean {
  // constant-time comparison to prevent timing attacks
  if (!token || !expected) return false
  if (token.length !== expected.length) return false
  let result = 0
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}

export function validateToken(
  headerValue: string | null | undefined,
  cookieValue: string | null | undefined,
): boolean {
  return validateCsrfToken(cookieValue ?? "", headerValue ?? "");
}
