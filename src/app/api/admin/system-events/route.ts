import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, handleError, notFound } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";

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

    const body = await request.json();
    const event = await prisma.systemEvent.create({
      data: {
        eventType: body.eventType ?? "info",
        title: body.title ?? "",
        message: body.message ?? "",
        severity: body.severity ?? "info",
        metadata: (body.metadata ?? {}) as object,
        read: false,
      },
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

    const body = await request.json();
    if (!body.id) return error("id is required", 400);

    const existing = await prisma.systemEvent.findUnique({ where: { id: body.id } });
    if (!existing) return notFound("SystemEvent");

    const event = await prisma.systemEvent.update({
      where: { id: body.id },
      data: {
        ...(body.eventType !== undefined ? { eventType: body.eventType } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.message !== undefined ? { message: body.message } : {}),
        ...(body.severity !== undefined ? { severity: body.severity } : {}),
        ...(body.read !== undefined ? { read: body.read } : {}),
        ...(body.metadata !== undefined ? { metadata: body.metadata as object } : {}),
      },
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
