import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "تم تأكيد الطلب",
  /* r128-F5 (توحيد توكن العلامة): آخر موضع og/description متبقٍّ على التوكن
     الآخر «المنيو الذكي» — العلامة الموحّدة للمنتج هي «الربط الذكي | Smart
     Menu» (README/manifest/القوالب، قرار r127-F3). */
  description: "تم تأكيد طلبك بنجاح — شكراً لتسوقك عبر الربط الذكي",
  robots: { index: false, follow: false },
};

export default function OrderConfirmedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
