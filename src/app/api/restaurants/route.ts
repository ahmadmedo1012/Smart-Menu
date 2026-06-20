import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError, paginated } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  workingHours: z.string().optional(),
  planId: z.number().int().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(4).optional(),
});

export async function GET() {
  try {
    const [data, total] = await Promise.all([
      prisma.restaurant.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { orders: true, categories: true } },
          plan: { select: { id: true, name: true, nameAr: true, price: true } },
        },
      }),
      prisma.restaurant.count(),
    ]);
    return success({ restaurants: data, total });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = createSchema.parse(await request.json());
    // Allow public registration when username/password provided (new account)
    if (!body.username || !body.password) {
      const auth = await requireAuth();
      if (!auth.authorized || auth.role !== "admin") return error("غير مصرح", 401);
    }

    // Check slug uniqueness
    const existingSlug = await prisma.restaurant.findUnique({ where: { slug: body.slug } });
    if (existingSlug) return error("الرابط المختصر مستخدم بالفعل", 409);

    const data = await prisma.restaurant.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description ?? "",
        phone: body.phone ?? "",
        whatsapp: body.whatsapp ?? "",
        email: body.email ?? "",
        address: body.address ?? "",
        workingHours: body.workingHours ?? "",
        planId: body.planId ?? null,
      },
    });

    // Create owner user if username/password provided
    if (body.username && body.password) {
      const { hashPassword } = await import("@/lib/hash");
      await prisma.user.create({
        data: {
          username: body.username,
          password: hashPassword(body.password),
          name: body.name,
          role: "owner",
          restaurantId: data.id,
          planId: body.planId ?? null,
        },
      });
    }

    return success(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
