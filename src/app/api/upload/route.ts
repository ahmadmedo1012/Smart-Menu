import { NextRequest } from "next/server";
import { success, error, handleError } from "@/lib/api-helpers";
import { requireAuth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { createDbRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const rateLimiter = createDbRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
        try {
                // Early content-length guard — reject before parsing body
                const cl = request.headers.get("content-length");
                if (cl && Number(cl) > MAX_SIZE) return error("الملف كبير جداً (الحد الأقصى 5MB)", 413);

                if (!process.env.BLOB_READ_WRITE_TOKEN) {
                        return error("خدمة رفع الملفات غير مضبوطة — يرجى إعداد BLOB_READ_WRITE_TOKEN", 500);
                }

                const auth = await requireAuth();
                if (!auth.authorized) return error("غير مصرح", 401);

                // Rate limit: 5 req/min per IP + user (userId in key so one user can't
                // burn a shared-IP quota, IP in key so one user can't spread across IPs)
                const ip = getClientIp(request); // round91-D1: unified extraction
                const rl = await rateLimiter.check(`upload:${ip}:${auth.userId}`);
                if (!rl.success) return error("طلبات كثيرة جداً، حاول بعد قليل", 429);

                const formData = await request.formData();
                const file = formData.get("file");
                if (!(file instanceof File && file.size > 0)) return error("الملف غير صالح", 400);
                if (file.size > MAX_SIZE) return error("الملف كبير جداً (الحد الأقصى 5MB)", 413);
                if (!ALLOWED.includes(file.type)) return error("يُسمح فقط بملفات JPG, PNG, WebP, AVIF", 400);

                const buffer = Buffer.from(await file.arrayBuffer());

                // Magic byte validation — don't trust client-declared Content-Type.
                // round91-F-E (D2-#6): أول 48 بايت الآن (كانت 12) — توسيع عائلة AVIF مع
                // البقاء فاشلًا-مغلقًا: كنا نقبل فقط صناديق ftyp بحجم 0x1c/0x20 وعلامة
                // «avif» الرئيسية، فترتد ملفات AVIF قانونية أخرى (avis للصور المتحركة،
                // mif1/miaf كعلامات رئيسية/متوافقة، أحجام 0x18/0x24) برسالة 400 خاطئة.
                // القبول الآن: صندوق ftyp في موضعه (بايتات 4..7) + علامة رئيسية أو علامة
                // متوافقة داخل حدود الصندوق من {avif, avis, mif1, miaf}.
                // فروع JPEG/PNG/WEBP أدناه لم تُمَس (فحص startsWith لا يتأثر بطول hex).
                const hex = buffer.subarray(0, 48).toString("hex");
                const isJpeg = hex.startsWith("ffd8ff");
                const isPng = hex.startsWith("89504e47");
                // round90-F5: كان الفحص يقرأ hex.slice(8,16) = بايتات 4..7 (حقل حجم RIFF)
                // بدل العلامة «WEBP» في بايتات 8..11 — كل ملف webp حقيقي كان يُرفض 400
                // بينما ملف ترويسته يتهجّى «WEBP» موضع الحجم يُقبل. الصحيح: slice(16,24).
                const isWebp = hex.startsWith("52494646") && hex.slice(16, 24) === "57454250";
                // بنية صندوق ftyp: بايتات 0..3 = الحجم، 4..7 = «ftyp»، 8..11 = العلامة
                // الرئيسية، 12..15 = الإصدار، 16.. = العلامات المتوافقة (4 بايتات لكل واحدة).
                // المسح المتوافق محدود بحدود الصندوق المعلنة (حتى 48 بايت) — علامة تظهر
                // خارج الصندوق لا تُحتسب (فشل مغلق ضد ملفات مزوّرة).
                const AVIF_BRANDS = new Set(["61766966", "61766973", "6d696631", "6d696166"]); // avif · avis · mif1 · miaf
                const ftypSize = Number.parseInt(hex.slice(0, 8), 16);
                const isFtyp = hex.slice(8, 16) === "66747970" && ftypSize >= 16; // أقل من 16 = صندوق مشوّه
                let hasAvifBrand = isFtyp && AVIF_BRANDS.has(hex.slice(16, 24)); // العلامة الرئيسية
                for (
                        let off = 32;
                        isFtyp && !hasAvifBrand && off + 8 <= Math.min(ftypSize, 48) * 2 && off + 8 <= hex.length;
                        off += 8
                ) {
                        if (AVIF_BRANDS.has(hex.slice(off, off + 8))) hasAvifBrand = true; // علامة متوافقة
                }
                const isAvif = isFtyp && hasAvifBrand;
                if (!isJpeg && !isPng && !isWebp && !isAvif) return error("محتويات الملف لا تطابق صيغة صورة صالحة", 400);

                // Upload to Vercel Blob — CDN-cached, no DB bloat
                // round86-A3: tenant-marked path (restaurants/{id}/… or staff/…) so
                // deleteBlob can enforce tenant boundaries on replace/delete.
                const tenantDir = auth.restaurantId ? `restaurants/${auth.restaurantId}/` : 'staff/';
                const filename = `${tenantDir}${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
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
