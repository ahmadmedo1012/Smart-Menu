import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";

const IMAGE_MAP: Record<string, string> = {
  "قهوة تركي": "https://images.unsplash.com/photo-1559491928-b6b03e9d8485?w=400&q=85",
  "إسبريسو": "https://images.unsplash.com/photo-1717269944314-d70b12b80e67?w=400&q=85",
  "كابتشينو": "https://images.unsplash.com/photo-1559499147-c76f6b3671e2?w=400&q=85",
  "شاي": "https://images.unsplash.com/photo-1571934825821-5c2f3d7a1c9c?w=400&q=85",
  "ليموناضة": "https://images.unsplash.com/photo-1621263635-1f5b2d6f8c5d?w=400&q=85",
  "سموثي": "https://images.unsplash.com/photo-1553530661-c2d1a3e8e1b9?w=400&q=85",
  "موهيتو": "https://images.unsplash.com/photo-1551536221-f47c0f5f8e9d?w=400&q=85",
  "آيس كوفي": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=85",
  "تشيز كيك": "https://images.unsplash.com/photo-1559339351-5d4b7c5e2f8d?w=400&q=85",
  "كنافة": "https://images.unsplash.com/photo-1579631552-1c4a1c8e9f0d?w=400&q=85",
  "كريب": "https://images.unsplash.com/photo-1559054359-8b3f5b2a1c0d?w=400&q=85",
  "بسبوسة": "https://images.unsplash.com/photo-1580914567-b68f8d7e3e9c?w=400&q=85",
  "ساندويتش": "https://images.unsplash.com/photo-1550506432-6d2c6c9b5e3d?w=400&q=85",
  "بطاطس مقلية": "https://images.unsplash.com/photo-1573080161-8c4a5b6d7e8f?w=400&q=85",
  "سلطة": "https://images.unsplash.com/photo-1540189549-8c9b3a1d5e7f?w=400&q=85",
  "برجر": "https://images.unsplash.com/photo-1568902115-7b9f2a1c8e4d?w=400&q=85",
  "بازين": "https://images.unsplash.com/photo-1563379928-15a4f3f5f5b3?w=400&q=85",
  "مبكبكة": "https://images.unsplash.com/photo-1540189549-8c9b3a1d5e7f?w=400&q=85",
  "كُسكُسي": "https://images.unsplash.com/photo-1598866594230-9ae50a6c0e96?w=400&q=85",
  "شربة": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=85",
  "بريك": "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=400&q=85",
  "بيتزا مارغريتا": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=85",
  "بيتزا بيبروني": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=85",
  "بيتزا خضار": "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&q=85",
  "كوكاكولا": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=85",
  "عصير طازج": "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&q=85",
};

export async function GET() {
  let updated = 0;
  let errors = 0;

  const items = await prisma.menuItem.findMany({ where: { image: "" } });
  for (const item of items) {
    const img = IMAGE_MAP[item.name];
    if (img) {
      try {
        await prisma.menuItem.update({ where: { id: item.id }, data: { image: img, nameAr: item.name } });
        updated++;
      } catch { errors++; }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Updated ${updated} items with images${errors ? `, ${errors} errors` : ""}`,
    total: items.length,
    updated,
  });
}
