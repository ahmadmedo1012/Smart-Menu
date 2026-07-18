import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الباقات والأسعار",
  description: "اختر الباقة المناسبة لمطعمك أو مقهاك — باقات مرنة مع منيو رقمي، طلب واتساب، برنامج ولاء والمزيد",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
