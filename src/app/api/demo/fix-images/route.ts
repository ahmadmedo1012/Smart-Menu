import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";

const FIX_IMAGES: Record<string, string> = {
  "قهوة تركي": "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
  "إسبريسو": "https://images.unsplash.com/photo-1504630083234-14187a9df0f5",
  "كابتشينو": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
  "شاي": "https://images.unsplash.com/photo-1571934811356-5cc061b6821f",
  "ليموناضة": "https://images.unsplash.com/photo-1544145945-f90425340c7e",
  "سموثي": "https://images.unsplash.com/photo-1553530661-c2d1a3e8e1b9",
  "موهيتو": "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38",
  "آيس كوفي": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735",
  "تشيز كيك": "https://images.unsplash.com/photo-1551024601-bec78aea704b",
  "كنافة": "https://images.unsplash.com/photo-1559339351-5d4b7c5e2f8d",
  "كريب": "https://images.unsplash.com/photo-1509365465985-25d11c17e812",
  "بسبوسة": "https://images.unsplash.com/photo-1559054359-8b3f5b2a1c0d",
  "ساندويتش": "https://images.unsplash.com/photo-1550506432-6d2c6c9b5e3d",
  "بطاطس مقلية": "https://images.unsplash.com/photo-1573080161-8c4a5b6d7e8f",
  "سلطة": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
  "برجر": "https://images.unsplash.com/photo-1568902115-7b9f2a1c8e4d",
  "بازين": "https://images.unsplash.com/photo-1563379928-15a4f3f5f5b3",
  "مبكبكة": "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
  "كُسكُسي": "https://images.unsplash.com/photo-1598866594230-9ae50a6c0e96",
  "شربة": "https://images.unsplash.com/photo-1547592166-23ac45744acd",
  "بريك": "https://images.unsplash.com/photo-1604382355076-af4b0eb60143",
  "بيتزا مارغريتا": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38",
  "بيتزا بيبروني": "https://images.unsplash.com/photo-1628840042765-356cda07504e",
  "بيتزا خضار": "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca",
  "كوكاكولا": "https://images.unsplash.com/photo-1554866585-cd94860890b7",
  "عصير طازج": "https://images.unsplash.com/photo-1622597467836-f3285f2131b8",
};

export async function GET() {
  let updated = 0;
  let errors = 0;
  const items = await prisma.menuItem.findMany({ where: { image: "" } });
  for (const item of items) {
    const img = FIX_IMAGES[item.name];
    if (img) {
      try {
        await prisma.menuItem.update({ where: { id: item.id }, data: { image: img + "?w=400&q=85" } });
        updated++;
      } catch { errors++; }
    }
  }
  return NextResponse.json({ success: true, message: "Updated " + updated + " items (" + errors + " errors)" });
}
