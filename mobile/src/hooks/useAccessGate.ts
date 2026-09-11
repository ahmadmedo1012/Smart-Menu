import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import type { Role, Permission } from "@/lib/auth-types";
import { ADMIN_ROLES } from "@/lib/auth-types";

export type AccessGateResult =
  | { status: "checking" } | { status: "allowed" } | { status: "denied"; reason: string };

export function allowRolesOrPermission(roles: Role[], permission?: Permission) {
  return (user: { role: Role; permissions: Permission[] } | null): AccessGateResult => {
    if (!user) return { status: "denied", reason: "يجب تسجيل الدخول" };
    if (roles.includes(user.role)) return { status: "allowed" };
    if (permission && user.permissions.includes(permission)) return { status: "allowed" };
    return { status: "denied", reason: "لا تملك الصلاحية" };
  };
}

export function useAccessGate(
  checker: (u: { role: Role; permissions: Permission[] } | null) => AccessGateResult,
): AccessGateResult {
  const user = useAuth((s) => s.user);
  const status = useAuth((s) => s.status);
  const [result, setResult] = useState<AccessGateResult>({ status: "checking" });
  useEffect(() => {
    if (status === "loading" || status === "idle") { setResult({ status: "checking" }); return; }
    if (status === "unauthenticated" || !user) { setResult({ status: "denied", reason: "يجب تسجيل الدخول" }); return; }
    setResult(checker(user));
  }, [user, status, checker]);
  return result;
}

export const adminAccessGate = allowRolesOrPermission(ADMIN_ROLES);
export const ownerAccessGate = allowRolesOrPermission(["owner"]);
