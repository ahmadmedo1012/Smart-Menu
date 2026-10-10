/**
 * r135-TABLE: رقم الطاولة من رابط QR لكل طاولة — قراءة/تنظيف الجلسة.
 *
 * لماذا وحدة منفصلة؟ اختبار r121-cart-ux يثبّت ترتيب المصدر في صفحة
 * السلة (حارس الملاحظات قبل أول `try {` في الملف) — أي try/catch مضاف
 * فوق الحارس يكسر الـpin. منطق الجلسة هنا يبقى قابلاً للاختبار بمعزل،
 * وصفحة السلة تظل نظيفة من كتل try جديدة.
 *
 * العقد:
 * - المنيو (MenuPageClient) يكتب `smartmenu_table` في sessionStorage عند
 *   دخول الزبون من ‎?table=N‎ (مرة واحدة لكل جلسة عرض).
 * - السلة تقرأه عند الإرسال وتلحق «طاولة: N» بملاحظات الطلب.
 * - النطاق 1..999 (طاولات حقيقية؛ أي شيء خارج النطاق يُتجاهل كتشويش
 *   في الرابط).
 * - sessionStorage لا الجلسة الدائمة: زبون الغد على نفس الجهاز يفتح
 *   جلسة جديدة فارغة — لا يرث طاولة الأمس.
 */

/* (r138): الثلاثة داخليون — الواجهة العامة للوحدة هي captureTableFromUrl
   وreadTableNumber. */
const TABLE_SESSION_KEY = 'smartmenu_table';
const TABLE_MAX = 999;

/** قيمة رقمية صالحة أم لا (عدد صحيح ضمن 1..999). */
function isValidTableNumber(n: number): boolean {
        return Number.isInteger(n) && n > 0 && n <= TABLE_MAX;
}

/**
 * يقرأ رقم الطاولة من معلمات الرابط الحالي (‎?table=N‎) — إن وُجد كتبه
 * إلى الجلسة (مصدر الحقيقة للانتقال إلى السلة)، وإلا استأنف القيمة
 * المخزنة من تنقّل سابق داخل نفس التبويب.
 *
 * SSR-آمنة بلا فروع server: الاستدعاء الوحيد من useEffect عميلي.
 */
export function captureTableFromUrl(): number | null {
        try {
                const params = new URLSearchParams(window.location.search);
                const raw = params.get('table');
                const parsed = raw ? Number(raw) : NaN;
                if (isValidTableNumber(parsed)) {
                        sessionStorage.setItem(TABLE_SESSION_KEY, String(parsed));
                        return parsed;
                }
                const stored = sessionStorage.getItem(TABLE_SESSION_KEY);
                const fromSession = stored ? Number(stored) : NaN;
                return isValidTableNumber(fromSession) ? fromSession : null;
        } catch {
                /* الوضع الخاص (private mode) — الجدول تحسين تدريجي */
                return null;
        }
}

/** يقرأ رقم الطاولة المخزّن للجلسة (بلا كتابة) — للاستخدام عند الإرسال. */
export function readTableNumber(): number | null {
        try {
                const stored = sessionStorage.getItem(TABLE_SESSION_KEY);
                const parsed = stored ? Number(stored) : NaN;
                return isValidTableNumber(parsed) ? parsed : null;
        } catch {
                return null;
        }
}
