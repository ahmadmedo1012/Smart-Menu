import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "سلة الطلبات",
  description: "سلة طلباتك — راجع الأصناف المضافة قبل إرسال الطلب عبر واتساب",
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
