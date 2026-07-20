import { NextRequest } from "next/server";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { createDbRateLimiter } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const rateLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
	try {
		// Rate limit: 5 req/min per IP
		const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
		const rl = await rateLimiter.check(`upload:${ip}`);
		if (!rl.success) return error("طلبات كثيرة جداً، حاول بعد قليل", 429);

		// Early content-length guard — reject before parsing body
		const cl = request.headers.get("content-length");
		if (cl && Number(cl) > MAX_SIZE) return error("الملف كبير جداً (الحد الأقصى 5MB)", 413);

		if (!process.env.BLOB_READ_WRITE_TOKEN) {
			return error("خدمة رفع الملفات غير مضبوطة — يرجى إعداد BLOB_READ_WRITE_TOKEN", 500);
		}

		const auth = await requireAuth();
		if (!auth.authorized) return error("غير مصرح", 401);

		const formData = await request.formData();
		const file = formData.get("file");
		if (!(file instanceof File && file.size > 0)) return error("الملف غير صالح", 400);
		if (file.size > MAX_SIZE) return error("الملف كبير جداً (الحد الأقصى 5MB)", 413);
		if (!ALLOWED.includes(file.type)) return error("يُسمح فقط بملفات JPG, PNG, WebP, AVIF", 400);

		const buffer = Buffer.from(await file.arrayBuffer());

		// Magic byte validation — don't trust client-declared Content-Type
		const hex = buffer.subarray(0, 12).toString("hex");
		const isJpeg = hex.startsWith("ffd8ff");
		const isPng = hex.startsWith("89504e47");
		const isWebp = hex.startsWith("52494646") && hex.slice(8, 16) === "57454250";
		const isAvif = hex.startsWith("0000001c6674797061766966") || (hex.startsWith("00000020") && hex.includes("6674797061766966"));
		if (!isJpeg && !isPng && !isWebp && !isAvif) return error("محتويات الملف لا تطابق صيغة صورة صالحة", 400);

		// Upload to Vercel Blob — CDN-cached, no DB bloat
		const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
		const { url } = await put(filename, buffer, {
			access: "public",
			contentType: file.type,
		});

		return success({ url, size: buffer.length }, 201);
	} catch (e) {
		// Ponytail: blob upload failures (missing token, network, quota) surface as 500 with a generic message.
		// The client now reads the error body, so the user sees context-relevant messages.
		return handleError(e);
	}
}
