/**
 * W7-B — بناء CSV تصدير الطلبات: المصدر الواحد الذي يستهلكه مسار الخادم
 * /api/orders/export.
 *
 * حتى W6-B6 كان التصدير تجميعًا في المتصفح (صفحات GET /api/orders
 * المتتالية ثم تركيب الملف محليًا). قرار G-4: بوابة الخطة الاحترافية
 * للتصدير تحتاج مسارًا خادميًا يُرفض فيه المالك دون الرتبة (403 عائلة
 * قبل أي استعلام) — فانتقل تركيب الملف إلى الخادم، والعقد كما هو:
 *   - نفس الأعمدة السبعة حرفيًا (رقم الطلب…التاريخ)؛
 *   - نفس حارس حقن المعادلات (البادئات = + - @ تُسبَق بعلامة اقتباس)؛
 *   - سقف 5000 صف الصادق نفسه (W6-B6) — التجاوز يُعلَن لا يُقص بصمت
 *     (ترويسة X-Export-Truncated يحوّلها التوست إلى العبارة نفسها)؛
 *   - بحث المالك نفسه (orderNo/customerName) صار يُطبَّق خادميًا.
 *
 * فرق موثق: عمود التاريخ كان يستخدم formatDate (ساعة جهاز الزائر — العميل
 * في ليبيا غالبًا) لكن الخادم على Vercel يعمل UTC فتتأخر الأوقات ساعتين
 * إلى ثلاث. القاعدة R8 (r133-A12: «ISO يبقى في الخلفية، أوقات العرض
 * بطرابلس») تحسم: التنسيق هنا formatDateTripoli — مثبت على
 * Africa/Tripoli أينما رُكّب الملف.
 */
import { toArabicNumber, formatDateTripoli } from '@/lib/format';
import { getOrderStatusMeta, getPickupTypeMeta } from '@/lib/order-status';

/** نفس سقف W6-B6 — سقف صادق لذاكرة الخادم وحجم الملف، يُعلَن عند بلوغه. */
export const EXPORT_ROW_CAP = 5000;
/** صفحات جلب الخادم الداخلية (أكبر من سقف قائمة العرض 100 — تصدير فقط). */
export const EXPORT_PAGE_SIZE = 500;

/** حارس حقن المعادلات — كما كان حرفيًا في واجهة المالك (W6-B6). */
export function escapeCsvCell(v: string | number): string {
        const s = String(v ?? '');
        // formula-injection guard: neutralize = + - @ leading chars
        const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
        return `"${safe.replace(/"/g, '""')}"`;
}

/** صف الطلب كما يستهلكه التصدير (إسقاط قائمة العرض النحيف نفسه). */
export interface ExportOrderRow {
        orderNo: string;
        customerName: string;
        customerPhone: string;
        status: string;
        pickupType: string;
        total: number | { toNumber?: () => number } | unknown;
        createdAt: Date | string;
}

function totalNumber(total: ExportOrderRow['total']): string {
        const n =
                typeof total === 'number'
                        ? total
                        : total !== null && typeof total === 'object' && typeof (total as { toNumber?: unknown }).toNumber === 'function'
                          ? (total as { toNumber: () => number }).toNumber()
                          : Number(total);
        return Number.isFinite(n) ? String(n) : '0';
}

/** رأس الأعمدة — نفس الترتيب والصياغة الحرفية من واجهة W6-B6. */
export const ORDERS_CSV_HEADERS =
        'رقم الطلب,العميل,الهاتف,الحالة,النوع,المجموع,التاريخ';

/** جسم CSV (بدون BOM — المتصل يضيفها مرة واحدة عند الإرسال). */
export function buildOrdersCsv(rows: readonly ExportOrderRow[]): string {
        const lines = rows.map((o) => {
                const statusLabel = getOrderStatusMeta(o.status).label;
                const typeLabel = getPickupTypeMeta(o.pickupType).label;
                const created = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt);
                return [
                        escapeCsvCell(o.orderNo),
                        escapeCsvCell(o.customerName),
                        escapeCsvCell(o.customerPhone || ''),
                        escapeCsvCell(statusLabel),
                        escapeCsvCell(typeLabel),
                        escapeCsvCell(totalNumber(o.total)),
                        escapeCsvCell(formatDateTripoli(created)),
                ].join(',');
        });
        return [ORDERS_CSV_HEADERS, ...lines].join('\n');
}

/** اسم الملف نفسه (orders-YYYY-MM-DD.csv) — من ساعة الخادم، تاريخ فقط. */
export function ordersCsvFileName(now = new Date()): string {
        const stamp = now.toISOString().slice(0, 10);
        return `orders-${stamp}.csv`;
}

/** رسالة التوست عند السقف — نفس عبارة W6-B6 (توحيد حرفي). */
export function exportCappedToastPhrase(exportedRows: number): string {
        return `تم تصدير أول ${toArabicNumber(exportedRows)} طلب (سقف التصدير — نطاقك يتجاوزه)`;
}
