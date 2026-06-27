import { NextRequest } from "next/server";
import { z } from "zod";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const fileSchema = z
	.instanceof(File)
	.refine((f) => f.size > 0, "الملف فارغ")
	.refine((f) => f.size <= MAX_SIZE, "الملف كبير جداً (الحد الأقصى 10MB)")
	.refine((f) => ALLOWED.includes(f.type), "يُسمح فقط بملفات JPG, PNG, WebP, AVIF");

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error("غير مصرح", 401);

		const formData = await request.formData();
		const file = formData.get("file");
		const parsed = fileSchema.safeParse(file);
		if (!parsed.success) return error(parsed.error.issues[0].message, 400);

		const f = parsed.data;
		const buffer = Buffer.from(await f.arrayBuffer());

		// Return as base64 data URL — works on Vercel (no filesystem writes)
		const base64 = buffer.toString("base64");
		const dataUrl = `data:${f.type};base64,${base64}`;

		return success({ url: dataUrl, size: buffer.length }, 201);
	} catch (e) {
		return handleError(e);
	}
}
