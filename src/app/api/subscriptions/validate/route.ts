import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";
import { z } from "zod";

const validateSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  slug: z.string().min(3, "الرابط يجب أن يكون 3 أحرف على الأقل").regex(/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على أحرف إنكليزية وأرقام فقط"),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = validateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ valid: false, errors: { _form: parsed.error.issues[0].message } }, { status: 400 });
    }
    const { username, slug } = parsed.data;

    const errors: { username?: string; slug?: string } = {};

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) errors.username = "اسم المستخدم مستخدم بالفعل";

    const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingRestaurant) errors.slug = "الرابط محجوز مسبقاً";

    if (!errors.slug) {
      const slugPending = await prisma.subscriptionPayment.findFirst({
        where: { status: "pending", metadata: { path: ["tempRestaurantSlug"], equals: slug } },
      });
      if (slugPending) errors.slug = "الرابط محجوز بطلب دفع معلق";
    }

    if (Object.keys(errors).length > 0) {
      return success({ valid: false, errors }, 200);
    }

    return success({ valid: true }, 200);
  } catch (e) {
    return handleError(e);
  }
}
