import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

const singleSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const batchSchema = z.array(singleSchema);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let restaurantId = Number(searchParams.get("restaurantId")) || auth.restaurantId || 0;
    if (!restaurantId) {
      return Response.json({ success: false, error: "معرف المطعم مطلوب" }, { status: 400 });
    }

    const [settings, restaurant] = await Promise.all([
      prisma.setting.findMany({ where: { restaurantId } }),
      prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    ]);

    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    return success({ settings: map, restaurant });
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    let restaurantId =
      Number(searchParams.get("restaurantId")) || auth.restaurantId || 0;
    if (!restaurantId) {
      return Response.json({ success: false, error: "معرف المطعم مطلوب" }, { status: 400 });
    }
    // Owners can only update their own restaurant
    if (auth.role === "owner" && auth.restaurantId !== restaurantId) {
      return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }
    const body = await request.json();

    // Accept both single object and batch array
    if (Array.isArray(body)) {
      const items = batchSchema.parse(body);
      await prisma.$transaction(
        items.map((item) =>
          prisma.setting.upsert({
            where: {
              restaurantId_key: { restaurantId, key: item.key },
            },
            create: { key: item.key, value: item.value, restaurantId },
            update: { value: item.value },
          })
        )
      );
      // Also update restaurant fields that match
      const restaurantFields = items.filter((i) =>
        ["name", "slug", "description", "logo", "phone", "whatsapp", "email", "address", "workingHours", "themeColor"].includes(i.key.replace("restaurant_", ""))
      );
      if (restaurantFields.length > 0) {
        const updateData: Record<string, string> = {};
        for (const f of restaurantFields) {
          const fieldName = f.key.replace("restaurant_", "");
          // Only update well-known fields
          if (["name", "slug", "description", "logo", "phone", "whatsapp", "email", "address", "workingHours", "themeColor"].includes(fieldName)) {
            (updateData as any)[fieldName] = f.value;
          }
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.restaurant.update({
            where: { id: restaurantId },
            data: updateData,
          });
        }
      }
      return success({ updated: items.length });
    }

    // Single object
    const item = singleSchema.parse(body);
    const data = await prisma.setting.upsert({
      where: { restaurantId_key: { restaurantId, key: item.key } },
      create: { key: item.key, value: item.value, restaurantId },
      update: { value: item.value },
    });
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}
