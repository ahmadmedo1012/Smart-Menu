import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { createDbRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const validateSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  slug: z.string().min(3, "الرابط يجب أن يكون 3 أحرف على الأقل").regex(/^[a-z0-9-]+$/, "الرابط يجب أن يحتوي على أحرف إنكليزية وأرقام فقط"),
});

const validateLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success: allowed } = await validateLimiter.check(`validate:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);

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
