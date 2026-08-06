import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
	title: "المنيو الرقمي | Smart Menu",
	description: "تصفح المنيوهات الرقمية للمطاعم والمقاهي — اطلب عبر واتساب، اربح نقاط ولاء.",
};

export default async function MenuPage() {
  const first = await prisma.restaurant.findFirst({
    where: { isActive: true },
    orderBy: { id: "asc" },
    select: { slug: true },
  });

  if (first) {
    redirect(`/menu/${first.slug}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center animate-fade-in">
      <h2 className="text-xl font-semibold">No restaurants available</h2>
      <p className="text-muted-foreground">Please check back later.</p>
    </div>
  );
}
