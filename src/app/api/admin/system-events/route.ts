import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError, notFound } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const createEventSchema = z.object({
  eventType: z.string().min(1).max(50).optional().default("info"),
  title: z.string().max(200).optional().default(""),
  message: z.string().max(1000).optional().default(""),
  severity: z.enum(["info", "warning", "error", "critical"]).optional().default("info"),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const updateEventSchema = z.object({
  id: z.number().int().positive(),
  eventType: z.string().min(1).max(50).optional(),
  title: z.string().max(200).optional(),
  message: z.string().max(1000).optional(),
  severity: z.enum(["info", "warning", "error", "critical"]).optional(),
  read: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

    const [data, total] = await Promise.all([
      prisma.systemEvent.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, eventType: true, title: true, message: true, severity: true, metadata: true, read: true, createdAt: true },
      }),
      prisma.systemEvent.count(),
    ]);

    return success({ data, total, page, pageSize });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const body = createEventSchema.parse(await request.json());
    const event = await prisma.systemEvent.create({
      data: { ...body, read: false } as any,
    });
    return success(event, 201);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const body = updateEventSchema.parse(await request.json());

    const existing = await prisma.systemEvent.findUnique({ where: { id: body.id } });
    if (!existing) return notFound("SystemEvent");

    const { id, ...data } = body;
    const event = await prisma.systemEvent.update({
      where: { id },
      data: data as any,
    });
    return success(event);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return error("غير مصرح", 401);

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return error("id query param is required", 400);

    const existing = await prisma.systemEvent.findUnique({ where: { id } });
    if (!existing) return notFound("SystemEvent");

    await prisma.systemEvent.delete({ where: { id } });
    return success({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
