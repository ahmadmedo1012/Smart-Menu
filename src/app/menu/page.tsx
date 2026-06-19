import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

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
