import { prisma } from "@/lib/db";
import MenuPageClient from "@/components/menu/MenuPageClient";

export default async function MenuPage() {
  try {
    const [categories, items] = await Promise.all([
      prisma.menuCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.menuItem.findMany({
        where: { status: "available" },
        include: { category: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    return <MenuPageClient categories={categories} items={items} />;
  } catch {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center animate-fade-in">
        <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-destructive">!</span>
        </div>
        <h2 className="text-xl font-semibold">تعذر تحميل القائمة</h2>
        <p className="text-muted-foreground">يرجى المحاولة مرة أخرى لاحقاً</p>
      </div>
    );
  }
}
