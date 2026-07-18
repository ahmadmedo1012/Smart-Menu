import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الاشتراك",
  description: "أكمل عملية الاشتراك في الباقة التي اخترتها لمطعمك وابدأ باستخدام المنيو الذكي",
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
