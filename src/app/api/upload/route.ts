import { NextRequest } from "next/server";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export async function POST(request: NextRequest) {
	try {
		const auth = await requireAuth();
		if (!auth.authorized) return error("غير مصرح", 401);

		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File && file.size > 0)) return error("الملف غير صالح", 400);
		if (file.size > MAX_SIZE) return error("الملف كبير جداً (الحد الأقصى 5MB)", 400);
		if (!ALLOWED.includes(file.type)) return error("يُسمح فقط بملفات JPG, PNG, WebP, AVIF", 400);

		const buffer = Buffer.from(await file.arrayBuffer());

		// Return as base64 data URL — works on Vercel (no filesystem writes)
		const base64 = buffer.toString("base64");
		const dataUrl = `data:${file.type};base64,${base64}`;

		return success({ url: dataUrl, size: buffer.length }, 201);
	} catch (e) {
		return handleError(e);
	}
}
