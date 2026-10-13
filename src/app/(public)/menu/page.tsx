import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
        // r121-L-4: brand suffix stripped — the root template already appends
        // the suffix (r127-F3 unified it to «| الربط الذكي»; page always
        // redirects to a real menu — keep the config honest for the brief
        // flash / fallback state).
        title: "المنيو الرقمي",
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
    /* Phase 6 (r154): the no-restaurant fallback composes the warm plate
       empty state (was two bare text lines) — same honest copy, composed
       anatomy: terracotta plate well + 18/600 title + CTA home. */
    <div className="flex min-h-[60vh] items-center justify-center px-4 animate-fade-in">
      <EmptyState
        icon={UtensilsCrossed}
        title="لا توجد مطاعم متاحة حالياً"
        description="المطبخ يستعد — يرجى زيارتنا لاحقاً لتتصفح المنيوهات الرقمية."
        action={
          <Link href="/">
            <Button variant="orange">العودة للرئيسية</Button>
          </Link>
        }
      />
    </div>
  );
}
