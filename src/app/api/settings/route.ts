import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error as apiError, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

const singleSchema = z.object({
	key: z.string().min(1),
	value: z.string(),
});

const batchSchema = z.array(singleSchema);

const RESTAURANT_FIELDS = ["name", "slug", "description", "logo", "gallery", "phone", "whatsapp", "email", "address", "workingHours", "themeColor", "pickupTypes"];

export async function GET(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return apiError("غير مصرح", 401);

		const { searchParams } = new URL(request.url);
		const restaurantId = Number(searchParams.get("restaurantId")) || auth.restaurantId || 0;
		if (!restaurantId) return apiError("معرف المطعم مطلوب", 400);

		const [settings, restaurant] = await Promise.all([
			prisma.setting.findMany({ where: { restaurantId }, select: { key: true, value: true } }),
			prisma.restaurant.findUnique({
				where: { id: restaurantId },
				include: { _count: { select: { orders: true, categories: true } } },
			}),
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
		if (!auth.authorized) return apiError("غير مصرح", 401);

		const { searchParams } = new URL(request.url);
		const restaurantId = Number(searchParams.get("restaurantId")) || auth.restaurantId || 0;
		if (!restaurantId) return apiError("معرف المطعم مطلوب", 400);

		if (auth.role === "owner" && auth.restaurantId !== restaurantId) {
			return apiError("غير مصرح", 401);
		}

		const body = await request.json();

		if (Array.isArray(body)) {
			const items = batchSchema.parse(body);
			await prisma.$transaction(
				items.map((item) =>
					prisma.setting.upsert({
						where: { restaurantId_key: { restaurantId, key: item.key } },
						create: { key: item.key, value: item.value, restaurantId },
						update: { value: item.value },
					})
				)
			);

			const restaurantFields = items.filter((i) => RESTAURANT_FIELDS.includes(i.key.replace("restaurant_", "")));
			if (restaurantFields.length > 0) {
				const updateData: Record<string, unknown> = {};
				for (const f of restaurantFields) {
					const fieldName = f.key.replace("restaurant_", "");
					if (RESTAURANT_FIELDS.includes(fieldName)) {
						updateData[fieldName] = fieldName === "gallery" ? safeJsonParse(f.value, []) : f.value;
					}
				}
				if (Object.keys(updateData).length > 0) {
					await prisma.restaurant.update({ where: { id: restaurantId }, data: updateData });
				}
			}
			return success({ updated: items.length });
		}

		const item = singleSchema.parse(body);
		await prisma.setting.upsert({
			where: { restaurantId_key: { restaurantId, key: item.key } },
			create: { key: item.key, value: item.value, restaurantId },
			update: { value: item.value },
		});
		return success(item);
	} catch (e) {
		return handleError(e);
	}
}

function safeJsonParse(val: string, fallback: unknown) {
	try { return JSON.parse(val); } catch { return fallback; }
}
