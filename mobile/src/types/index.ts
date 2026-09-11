import type { Role, Permission, SubscriptionStatus } from "@/lib/auth-types";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: Role;
  restaurantId: number | null;
  subscriptionStatus: SubscriptionStatus | null;
  permissions: Permission[];
}

export interface LoginResponse {
  user: AuthUser;
  sessionToken: string;
}

export type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: true; data: T; meta: { total: number; page: number; pageSize: number; totalPages: number } }
  | { success: false; error: string }
  | { success: false; error: string; details: unknown };

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function roleToInitialRoute(role: Role): "OwnerTabs" | "AdminTabs" | "Subscribe" {
  switch (role) {
    case "owner": return "OwnerTabs";
    case "super_admin":
    case "sub_admin":
    case "admin": return "AdminTabs";
    default: return "Subscribe";
  }
}
