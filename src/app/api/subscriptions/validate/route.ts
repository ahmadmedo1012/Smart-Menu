import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";
import { createDbRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { usernameOptional, slugOptional, slugField, isSlugHeldByPendingPayment } from "@/lib/validation";
import { getClientIp } from "@/lib/client-ip";
import { requireAuth } from "@/lib/auth";

// round97-X3: slug fields come from the shared policy in src/lib/validation.ts
// (SLUG_RE + normalizeSlug + min 3) — the inline duplicates (identical
// constraints on the single-slug path) were removed; behavior is unchanged
// for valid slugs and the array items now carry the same Arabic messages.
const validateSchema = z.object({
  username: usernameOptional,
  slug: slugOptional,
  slugs: z.array(slugField).optional(),
});

const validateLimiter = createDbRateLimiter({ windowMs: 60_000, max: 10 });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request); // round91-D1: unified extraction
    const { success: allowed } = await validateLimiter.check(`validate:${ip}`);
    if (!allowed) return error("محاولات كثيرة جداً. حاول لاحقاً.", 429);

    const parsed = validateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ valid: false, errors: { _form: parsed.error.issues[0].message } }, { status: 400 });
    }
    const { username, slug, slugs } = parsed.data;
    // Backward compat: accept either a single `slug` or an array `slugs`
    const slugList = (slugs && slugs.length > 0 ? slugs : slug ? [slug] : []).filter(Boolean);

    const errors: { username?: string; slug?: string } = {};

    if (username) {
      const existingUser = await prisma.user.findUnique({ where: { username } });
      // r103-F3: an already-registered user retrying a REJECTED paid payment
      // (account created before payment) re-enters the same username — that is
      // the designed retry path (subscriptions POST allows tempUsername == the
      // authenticated user), so it must not be reported as taken here.
      let isSelf = false;
      if (existingUser) {
        const auth = await requireAuth();
        isSelf = auth.authorized && existingUser.id === auth.userId;
      }
      if (existingUser && !isSelf) errors.username = "اسم المستخدم مستخدم بالفعل";
    }

    for (const s of slugList) {
      const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug: s } });
      if (existingRestaurant) { errors.slug = `الرابط ${s} محجوز مسبقاً`; break; }
      // r121-C3: the inline pending-reservation findFirst moved to the shared
      // helper (src/lib/validation.ts) now that every slug-write path enforces it.
      if (await isSlugHeldByPendingPayment(s, prisma)) {
        errors.slug = `الرابط ${s} محجوز بطلب دفع معلق`;
        break;
      }
    }

    if (Object.keys(errors).length > 0) {
      return success({ valid: false, errors }, 200);
    }

    return success({ valid: true }, 200);
  } catch (e) {
    return handleError(e);
  }
}
