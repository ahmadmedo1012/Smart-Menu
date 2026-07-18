import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "تسجيل الدخول إلى لوحة تحكم المنيو الذكي — إدارة منيو مطعمك وإحصائياتك",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
