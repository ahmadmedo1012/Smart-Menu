/**
 * CSRF — assertSameOrigin unit tests.
 * Verifies Origin/Host matching gate on mutating requests
 * and exemption list for webhook, health, auth endpoints.
 */
import { describe, it, expect } from "vitest";
import { assertSameOrigin } from "@/lib/csrf";

function makeRequest(method: string, pathname: string, origin: string | null, host: string): Request {
  const url = new URL(pathname, "https://" + host);
  const headers: Record<string, string> = { host };
  if (origin) headers["origin"] = origin;
  return new Request(url, { method, headers });
}

describe("assertSameOrigin", () => {
  describe("mutating methods (POST/PUT/PATCH/DELETE)", () => {
    it("POST with matching origin → passes", () => {
      const req = makeRequest("POST", "/api/restaurants", "https://example.com", "example.com");
      expect(() => assertSameOrigin(req)).not.toThrow();
    });

    it("POST with mismatched origin → throws 403", () => {
      const req = makeRequest("POST", "/api/restaurants", "https://attacker.com", "example.com");
      expect(() => assertSameOrigin(req)).toThrow("CSRF check failed: Origin mismatch");
    });

    it("POST with missing origin → throws", () => {
      const req = makeRequest("POST", "/api/restaurants", null, "example.com");
      expect(() => assertSameOrigin(req)).toThrow("CSRF check failed: missing Origin or Host");
    });

    it("PUT with mismatched origin → throws", () => {
      const req = makeRequest("PUT", "/api/restaurants/1", "https://evil.com", "example.com");
      expect(() => assertSameOrigin(req)).toThrow("Origin mismatch");
    });

    it("PATCH with mismatched origin → throws", () => {
      const req = makeRequest("PATCH", "/api/restaurants/1", "https://evil.com", "example.com");
      expect(() => assertSameOrigin(req)).toThrow("Origin mismatch");
    });

    it("DELETE with mismatched origin → throws", () => {
      const req = makeRequest("DELETE", "/api/restaurants/1", "https://evil.com", "example.com");
      expect(() => assertSameOrigin(req)).toThrow("Origin mismatch");
    });
  });

  describe("non-mutating method (GET)", () => {
    it("GET passes regardless of origin mismatch", () => {
      const req = makeRequest("GET", "/api/restaurants", "https://attacker.com", "example.com");
      expect(() => assertSameOrigin(req)).not.toThrow();
    });
  });

  describe("exempt paths", () => {
    it("/api/telegram/webhook passes with mismatched origin", () => {
      const req = makeRequest("POST", "/api/telegram/webhook", "https://external.com", "example.com");
      expect(() => assertSameOrigin(req)).not.toThrow();
    });

    it("/api/health passes with mismatched origin", () => {
      const req = makeRequest("POST", "/api/health", "https://monitor.com", "example.com");
      expect(() => assertSameOrigin(req)).not.toThrow();
    });

    it("/api/auth/login passes with mismatched origin", () => {
      const req = makeRequest("POST", "/api/auth/login", "https://phish.com", "example.com");
      expect(() => assertSameOrigin(req)).not.toThrow();
    });

    it("/api/auth/register passes with mismatched origin", () => {
      const req = makeRequest("POST", "/api/auth/register", "https://phish.com", "example.com");
      expect(() => assertSameOrigin(req)).not.toThrow();
    });

    it("sub-path under exempt path also passes (startsWith check)", () => {
      const req = makeRequest("POST", "/api/auth/login/extra", "https://phish.com", "example.com");
      expect(() => assertSameOrigin(req)).not.toThrow();
    });
  });

  describe("non-exempt API path still blocked", () => {
    it("/api/admin/restaurants POST with mismatched origin → throws", () => {
      const req = makeRequest("POST", "/api/admin/restaurants", "https://attacker.com", "example.com");
      expect(() => assertSameOrigin(req)).toThrow("Origin mismatch");
    });
  });
});
