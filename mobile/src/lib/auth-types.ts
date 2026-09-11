// Auth-domain types matching prisma/schema.prisma enums.

export type Role = "super_admin" | "sub_admin" | "admin" | "owner" | "USER";
export type Permission =
  | "APPROVE_ORDERS" | "MANAGE_SUBSCRIPTIONS" | "EDIT_SETTINGS"
  | "VIEW_ANALYTICS" | "MANAGE_RESTAURANTS" | "MANAGE_USERS";
export type SubscriptionStatus = "UNPAID" | "PAID" | "REJECTED" | "EXPIRED";

export const ROLE_LABELS_AR: Record<Role, string> = {
  super_admin: "مدير عام",
  sub_admin: "مدير فرعي",
  admin: "مدير",
  owner: "صاحب مطعم",
  USER: "مستخدم",
};

export const ADMIN_ROLES: Role[] = ["super_admin", "sub_admin", "admin"];

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}
export function isOwnerRole(role: Role): boolean {
  return role === "owner";
}
