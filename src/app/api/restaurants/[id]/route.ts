import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error as apiError, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  workingHours: z.string().optional(),
  logo: z.string().optional(),
  gallery: z.array(z.string()).optional(),
});

const adminUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  workingHours: z.string().optional(),
  logo: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  planId: z.number().int().optional(),
  planStart: z.string().datetime().optional(),
  planEnd: z.string().datetime().optional(),
  maxItems: z.number().int().positive().optional(),
  maxOrders: z.number().int().positive().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rId = Number(id);
    if (Number.isNaN(rId)) return apiError("Invalid ID", 400);
    const data = await prisma.restaurant.findUnique({
      where: { id: rId },
      include: {
        _count: { select: { orders: true, categories: true } },
        categories: { include: { _count: { select: { items: true } } }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!data) return apiError("Restaurant not found", 404);
    return success(data);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return apiError("غير مصرح", 401);

    const { id } = await params;
    const rId = Number(id);
    if (Number.isNaN(rId)) return apiError("Invalid ID", 400);

    const body = await request.json();

    let data;
    if (auth.role === "admin") {
      // Admin can update everything
      const parsed = adminUpdateSchema.parse(body);
      data = await prisma.restaurant.update({
        where: { id: rId },
        data: Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
      });
    } else if (auth.role === "owner") {
      // Owner can only update their own restaurant's basic info
      if (auth.restaurantId !== rId) {
        return apiError("غير مصرح", 401);
      }
      const parsed = updateSchema.parse(body);
      data = await prisma.restaurant.update({
        where: { id: rId },
        data: Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined)),
      });
    } else {
      return apiError("غير مصرح", 401);
    }

    return success(data);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized || auth.role !== "admin") {
      return apiError("غير مصرح", 401);
    }
    const { id } = await params;
    const rId = Number(id);
    if (Number.isNaN(rId)) return apiError("Invalid ID", 400);
    await prisma.restaurant.delete({ where: { id: rId } });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
