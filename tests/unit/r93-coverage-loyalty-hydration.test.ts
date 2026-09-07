/**
 * r93-W3 — بقية تقرير 1-d رقم 15: حارس hydration لمنشأ رابط الإحالة في
 * صفحة الولاء (owner/loyalty/page.tsx كانت تقرأ window.location.origin عند
 * مستوى التصيير — أول لقطة SSR فارغة المنشأ والعميل ممتلئه ⇒ اختلاف نص
 * المقارنة بين الخادم والـ hydration).
 *
 * نفس عقد U6 في r93-w2a-frontend-hygiene (النمط المعتمد ThemeToggle،
 * والمطبق على ReferralCard/ShareAfterOrder في W2-a) — لكن بملف مستقل
 * لأن ملف W2-a ليس لي (قاعدة الجولة) وصفحة الولاء لم تُكلَّف لأحد في
 * موجة 2. عقود المصدر هنا (نمط قراءة الملف القائم في المشروع):
 *   - الصفحة client component فعلًا ('use client' أول سطر)
 *   - mounted-guard موجود والقراءة غير المقيدة لـ window.location زالت
 *   - المنشأ المحروس هو منشأ رابط الإحالة المستخدم في النسخ/الQR/المشاركة
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(join(process.cwd(), 'src/app/(protected)/owner/loyalty/page.tsx'), 'utf8');

describe('r93-W3 — owner/loyalty: حارس hydration لمنشأ رابط الإحالة', () => {
        it('client component فعلًا: ' + "'use client'" + ' أول سطر في الملف', () => {
                // يحمي: الحارس (useState/useEffect) لا يعمل إلا في مكوّن عميل
                expect(PAGE.startsWith("'use client';\n")).toBe(true);
        });

        it('mounted-guard موجود بالنسخة المعتمدة (ThemeToggle/ReferralCard) والقراءة غير المقيدة زالت', () => {
                // يحمي: أول لقطة (ما يقارنه hydration) بلا window إطلاقًا
                expect(PAGE).toContain('const [mounted, setMounted] = useState(false)');
                expect(PAGE).toContain('useEffect(() => setMounted(true), [])');
                expect(PAGE).toContain("mounted ? window.location.origin : ''");
                expect(PAGE).not.toContain("typeof window !== 'undefined' ? window.location.origin");
        });

        it('المنشأ المحروس هو نفسه منشأ رابط الإحالة (النسخ/QR/واتساب)', () => {
                // يحمي: كل مستهلكي الرابط (handleCopyReferralLink/ReferralQR/
                // مشاركة واتساب) يتبعون الحارس — لا قراءة منشأ موازية
                expect(PAGE).toContain('const ownerRefUrl = `${origin}/owner/loyalty?ref=share`');
                // لا قراءة window.location ثانية خارج الحارس في الملف كله
                const windowReads = PAGE.match(/window\.location\.origin/g) ?? [];
                expect(windowReads.length).toBe(1);
        });
});
