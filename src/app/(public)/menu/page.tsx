import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
        title: "المنيو الرقمي | Smart Menu",
        description: "تصفح المنيوهات الرقمية للمطاعم والمقاهي — اطلب عبر واتساب، اربح نقاط ولاء.",
};

export default async function MenuPage() {
  // r120 (U3-P2-6): التوجيه كان يذهب لأول مطعم حقيائي حسب id (مقهى الواحة الفعلي)
  // بينما الزائر يتوقع المنيو التجريبي — نفس جذر U5-F-7. المنيو التجريبي أولًا،
  // مع بقاء الاحتياطي على أول مطعم نشط إن حُذف التجريبي.
  const DEMO_SLUG = 'al-waha-cafe-demo';
  const first =
    (await prisma.restaurant.findFirst({
      where: { isActive: true, slug: DEMO_SLUG },
      select: { slug: true },
    })) ??
    (await prisma.restaurant.findFirst({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      select: { slug: true },
    }));

  if (first) {
    redirect(`/menu/${first.slug}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center animate-fade-in">
      <h2 className="text-xl font-semibold">لا توجد مطاعم متاحة حالياً</h2>
      <p className="text-muted-foreground">يرجى زيارتنا لاحقاً.</p>
    </div>
  );
}
