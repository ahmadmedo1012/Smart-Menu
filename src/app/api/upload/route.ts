import { NextRequest } from "next/server";
import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { success, error, handleError } from "@/lib/api-helpers";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

const fileSchema = z
  .instanceof(File, { message: "File is required" })
  .refine((f) => f.size > 0, "File is empty")
  .refine((f) => f.size <= MAX_SIZE, "File exceeds 5MB limit")
  .refine(
    (f) => ALLOWED_MIMES.includes(f.type as (typeof ALLOWED_MIMES)[number]),
    "Only .jpg, .png, and .webp files are allowed"
  );

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    const parsed = fileSchema.safeParse(file);
    if (!parsed.success) {
      return error(parsed.error.issues[0].message, 400);
    }

    const f = parsed.data;
    const ext = f.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const buffer = Buffer.from(await f.arrayBuffer());
    const uploadDir = join(process.cwd(), "public", "uploads");

    await writeFile(join(uploadDir, filename), buffer);

    return success({ url: `/uploads/${filename}` }, 201);
  } catch (e) {
    return handleError(e);
  }
}
