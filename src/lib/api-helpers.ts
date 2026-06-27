import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { error as logError } from "@/lib/logger";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function validationError(err: ZodError) {
  const messages = err.issues.map(
    (e) => `${e.path.join(".")}: ${e.message}`
  );
  return NextResponse.json(
    { success: false, error: "Validation failed", details: messages },
    { status: 422 }
  );
}

export function notFound(entity = "Resource") {
  return error(`${entity} not found`, 404);
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
  if (e instanceof ZodError) return validationError(e);
  logError("handleError", { error: e instanceof Error ? e.message : String(e) });
  // Prisma unique constraint violation
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Unique constraint failed")) {
    return error("بيانات مكررة — هذا الاسم موجود مسبقاً", 409);
  }
  if (msg.includes("Foreign key constraint")) {
    return error("بيانات مرتبطة لا يمكن حذفها", 400);
  }
  return error(
    e instanceof Error ? e.message : "Internal server error",
    500
  );
}
