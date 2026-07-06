import { NextResponse } from "next/server";
import { error as logError } from "@/lib/logger";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ponytail: ZodError imported via type-only to avoid dual-package hazard at runtime
import type { ZodError } from "zod";

export function validationError(err: ZodError) {
  const messages = err.issues.map(
    (e) => `${e.path.join(".")}: ${e.message}`
  );
  return NextResponse.json(
    { success: false, error: "بيانات غير صالحة", details: messages },
    { status: 422 }
  );
}

export function notFound(entity = "المورد") {
  return error(`${entity} غير موجود`, 404);
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return NextResponse.json({
    success: true,
    data,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

export function handleError(e: unknown) {
  // Use duck-typing instead of ZodError instanceof (avoids dual-package hazard in Zod 4)
  if (e && typeof e === "object" && "issues" in e && Array.isArray((e as Record<string, unknown>).issues)) {
    return validationError(e as import("zod").ZodError);
  }
  const msg = e instanceof Error ? e.message : String(e);
  logError("handleError", { error: msg });

  // Prisma known request errors — safe, user-facing messages
  if (msg.includes("Unique constraint failed")) {
    return error("بيانات مكررة — هذا الاسم موجود مسبقاً", 409);
  }
  if (msg.includes("Foreign key constraint")) {
    return error("بيانات مرتبطة لا يمكن حذفها", 400);
  }
  if (msg.includes("Record to update not found") || msg.includes("Record to delete not found")) {
    return error("السجل غير موجود", 404);
  }
  if (msg.includes("connection") || msg.includes("timeout")) {
    return error("خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى", 503);
  }
  if (msg.includes("Invalid `")) {
    return error("بيانات غير صالحة", 400);
  }

  return error("حدث خطأ داخلي. حاول مرة أخرى", 500);
}
