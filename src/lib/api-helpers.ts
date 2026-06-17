import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function validationError(err: ZodError) {
  const issues: { path: (string | number)[]; message: string }[] =
    (err as { issues?: unknown[] }).issues as never ?? [];
  const messages = issues.map(
    (e) => `${String(e.path.join("."))}: ${e.message}`
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
  console.error(e);
  return error(
    e instanceof Error ? e.message : "Internal server error",
    500
  );
}
