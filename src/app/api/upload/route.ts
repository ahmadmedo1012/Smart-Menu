import { NextRequest } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

const fileSchema = z
  .instanceof(File)
  .refine((f) => f.size > 0, "File is empty")
  .refine((f) => f.size <= MAX_SIZE)
  .refine((f) => ALLOWED_MIMES.includes(f.type as never), "Only .jpg, .png, .webp, .avif allowed");

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAuth()).authorized) return error("غير مصرح", 401);

    const formData = await request.formData();
    const file = formData.get("file");
    const parsed = fileSchema.safeParse(file);
    if (!parsed.success) return error(parsed.error.issues[0].message, 400);

    const f = parsed.data;
    const ext = "webp";
    const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await f.arrayBuffer());
    const compressed = await sharp(buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 70, effort: 6 })
      .toBuffer();

    await writeFile(join(uploadDir, filename), compressed);

    const originalKb = Math.round(buffer.length / 1024);
    const compressedKb = Math.round(compressed.length / 1024);
    const reduction = Math.round((1 - compressed.length / buffer.length) * 100);

    return success({ url: `/uploads/${filename}`, originalKb, compressedKb, reduction: `${reduction}%` }, 201);
  } catch (e) {
    return handleError(e);
  }
}
