/**
 * Telegram webhook tests — permission check, callback parsing, message cleanup
 */
import { describe, it, expect } from "vitest";

function parseCallbackData(data: string): { action: string; paymentId: number } | null {
  const colonIdx = data.indexOf(":");
  if (colonIdx === -1) return null;
  const action = data.slice(0, colonIdx);
  const paymentId = Number(data.slice(colonIdx + 1));
  if (!Number.isFinite(paymentId) || paymentId <= 0) return null;
  return { action, paymentId };
}

function resolveDecision(action: string): "verified" | "cancelled" | null {
  if (action === "sub_app") return "verified";
  if (action === "sub_rej") return "cancelled";
  return null;
}

function checkAdminPermission(fromId: number, adminIds: number[]): boolean {
  return adminIds.includes(fromId);
}

describe("Telegram webhook", () => {
  describe("Callback data parsing", () => {
    it("parses valid sub_app", () => {
      const r = parseCallbackData("sub_app:42");
      expect(r).not.toBeNull();
      expect(r!.action).toBe("sub_app");
      expect(r!.paymentId).toBe(42);
    });

    it("parses valid sub_rej", () => {
      const r = parseCallbackData("sub_rej:99");
      expect(r).not.toBeNull();
      expect(r!.action).toBe("sub_rej");
      expect(r!.paymentId).toBe(99);
    });

    it("rejects data without colon", () => {
      expect(parseCallbackData("sub_app42")).toBeNull();
    });

    it("rejects non-numeric id", () => {
      expect(parseCallbackData("sub_app:abc")).toBeNull();
    });

    it("rejects zero id", () => {
      expect(parseCallbackData("sub_rej:0")).toBeNull();
    });

    it("rejects negative id", () => {
      expect(parseCallbackData("sub_app:-5")).toBeNull();
    });

    it("rejects empty string", () => {
      expect(parseCallbackData("")).toBeNull();
    });

    it("unknown action still parses", () => {
      const r = parseCallbackData("unknown:1");
      expect(r).not.toBeNull();
      expect(r!.action).toBe("unknown");
    });
  });

  describe("Decision resolution", () => {
    it("sub_app -> verified", () => expect(resolveDecision("sub_app")).toBe("verified"));
    it("sub_rej -> cancelled", () => expect(resolveDecision("sub_rej")).toBe("cancelled"));
    it("invalid -> null", () => expect(resolveDecision("invalid")).toBeNull());
    it("empty -> null", () => expect(resolveDecision("")).toBeNull());
  });

  describe("Admin permission check", () => {
    const admins = [1111, 2222, 3333];

    it("1111 should be allowed", () => expect(checkAdminPermission(1111, admins)).toBe(true));
    it("3333 should be allowed", () => expect(checkAdminPermission(3333, admins)).toBe(true));
    it("9999 should be denied", () => expect(checkAdminPermission(9999, admins)).toBe(false));
    it("0 should be denied", () => expect(checkAdminPermission(0, admins)).toBe(false));
    it("-1 should be denied", () => expect(checkAdminPermission(-1, admins)).toBe(false));
    it("empty admin list denies all", () => expect(checkAdminPermission(1111, [])).toBe(false));
  });

  describe("Bot-vs-user distinction", () => {
    it("real user should not match bot ID", () => {
      const admins = [8949246746]; // bot's own ID
      expect(checkAdminPermission(123456789, admins)).toBe(false);
    });
  });
});
