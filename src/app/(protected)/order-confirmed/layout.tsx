import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تم تأكيد الطلب",
  description: "تم تأكيد طلبك بنجاح — شكراً لتسوقك عبر المنيو الذكي",
};

export default function OrderConfirmedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
