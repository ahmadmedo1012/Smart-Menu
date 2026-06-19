import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { success, error, handleError } from "@/lib/api-helpers";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  workingHours: z.string().optional(),
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
  planId: z.number().int().optional(),
  planStart: z.string().datetime().optional(),
  planEnd: z.string().datetime().optional(),
  maxItemsLimit: z.number().int().positive().optional(),
  maxOrdersLimit: z.number().int().positive().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await prisma.restaurant.findUnique({
      where: { id: Number(id) },
      include: {
        _count: { select: { orders: true, categories: true } },
        categories: { include: { _count: { select: { items: true } } }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!data) return Response.json({ success: false, error: "Restaurant not found" }, { status: 404 });
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
    const { requireAuth } = await import("@/lib/auth");
    const auth = await requireAuth();
    if (!auth.authorized) return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    let data;
    if (auth.role === "admin") {
      // Admin can update everything
      const parsed = adminUpdateSchema.parse(body);
      data = await prisma.restaurant.update({
        where: { id: Number(id) },
        data: Object.fromEntries(Object.entries(parsed).filter(([_, v]) => v !== undefined)),
      });
    } else if (auth.role === "owner") {
      // Owner can only update their own restaurant's basic info
      if (auth.restaurantId !== Number(id)) {
        return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
      }
      const parsed = updateSchema.parse(body);
      data = await prisma.restaurant.update({
        where: { id: Number(id) },
        data: Object.fromEntries(Object.entries(parsed).filter(([_, v]) => v !== undefined)),
      });
    } else {
      return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
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
    const { requireAuth } = await import("@/lib/auth");
    const auth = await requireAuth();
    if (!auth.authorized || auth.role !== "admin") {
      return Response.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }
    const { id } = await params;
    await prisma.restaurant.delete({ where: { id: Number(id) } });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
