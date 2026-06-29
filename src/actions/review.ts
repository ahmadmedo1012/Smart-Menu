"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

export async function submitReview(formData: FormData) {
  const menuItemId = Number(formData.get("menuItemId"));
  const rating = Number(formData.get("rating"));
  const comment = (formData.get("comment") as string)?.trim() ?? "";
  const customerName = (formData.get("customerName") as string)?.trim() ?? "";
  const customerPhone = (formData.get("customerPhone") as string)?.trim() ?? "";

  if (!menuItemId || Number.isNaN(menuItemId)) throw new Error("Invalid menu item");
  if (!rating || rating < 1 || rating > 5) throw new Error("Rating must be 1-5");
  if (comment.length > 500) throw new Error("Comment too long");
  if (customerName.length > 50) throw new Error("Name too long");
  if (customerPhone.length > 20) throw new Error("Phone too long");

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: { rating, comment, customerName, customerPhone, menuItemId },
    });

    const agg = await tx.review.aggregate({
      where: { menuItemId },
      _avg: { rating: true },
      _count: true,
    });

    await tx.menuItem.update({
      where: { id: menuItemId },
      data: {
        avgRating: agg._avg.rating,
        ratingCount: agg._count,
      },
    });
  });

  revalidatePath("/menu/[slug]", "page");
}
