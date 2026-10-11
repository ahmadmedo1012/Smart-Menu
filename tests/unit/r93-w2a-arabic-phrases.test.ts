/**
 * r93-W2a (U2+U3) — الجمع العربي الديناميكي في المواضع الخمسة + الأرقام الغربية
 * الموحدة مع صياغة SSR-stable.
 *
 * تفتيش 1-d (جدول #3): خمس قوالب جمع مكسورة بعدد ديناميكي ثابت الشكل
 * («تم قبول ١ طلبات»، «٣ طلب»، «٢ صنف»، «رصيدك: N طلبات»، «N منيوهات») بينما
 * مكتبة src/lib/arabic-plural.ts جاهزة. كل موضع الآن يمر عبر مساعد عبارة محلي
 * (نمط cartCountPhrase من r92-A9) مبني على getArabicPlural — المساعدون
 * مُصدَّرون لتُبَث عباراتهم هنا (نفس سابقة CartSlideOver في r92).
 *
 * تفتيش 1-d (جدول #4): HeroSection:130 وFinalCTASection:36 استخدما (طُويا
 * داخل رحلة r128-F1b — عقد الأرقام الغربية يُثبَّت الآن على شريط الثقة
 * الحية في HomePage وقصة التقدم).
 * toLocaleString("ar") — أرقام هندية (١٢٣) تخالف سياسة المنصة (أرقام غربية،
 * format.ts) وخطر mismatch ICU عند ≥1000 لأن العبارة تُصيَّر SSR ثم عميلًا.
 * الآن toArabicNumber (محدد تمامًا: n.toString()).
 *
 * قواعد المكتبة نفسها مثبتة في tests/unit/arabic-plural.test.ts (لا تُلمس).
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

// محاكاة prisma قبل استيراد مسار الـ API (نمط r92-subadmin-pii) — العبارات
// النقية لا تحتاج قاعدة بيانات.
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { acceptedOrdersPhrase } from '@/components/orders/NewOrdersBar';
import { peakOrdersPhrase } from '@/app/(protected)/owner/OwnerCharts';
import { foundItemsPhrase } from '@/components/menu/MenuPageClient';
import { ordersBalancePhrase } from '@/app/api/loyalty/redeem/route';
import { menusLimitPhrase } from '@/app/(protected)/subscribe/SubscribeForm';
import { HomePage } from '@/components/landing/HomePage';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// ── U2: عبارات الجمع الخمس ────────────────────────────────────────────────

describe('U2 — acceptedOrdersPhrase (NewOrdersBar: «تم قبول …»)', () => {
    it('1/2/3/11/103: مفرد، مثنى، جمع، إفراد 11+، وحدّة CLDR 103', () => {
        expect(acceptedOrdersPhrase(1)).toBe('طلب واحد');
        expect(acceptedOrdersPhrase(2)).toBe('طلبين'); // منصوب بعد «تم قبول»
        expect(acceptedOrdersPhrase(3)).toBe('3 طلبات');
        expect(acceptedOrdersPhrase(11)).toBe('11 طلبًا');
        expect(acceptedOrdersPhrase(103)).toBe('103 طلبات'); // 103 % 100 = 3 → جمع
    });

    it('لا تعود الصيغة المكسورة «N طلبات» عند 1', () => {
        expect(acceptedOrdersPhrase(1)).not.toContain('طلبات');
    });

    it('حارس التوصيل: النص يمر بالمساعد والقالب القديم زال', () => {
        const s = src('src/components/orders/NewOrdersBar.tsx');
        expect(s).toContain('تم قبول ${acceptedOrdersPhrase(newOrderIds.length)}');
        expect(s).not.toContain('تم قبول ${toArabicNumber(newOrderIds.length)} طلبات');
        expect(s).toContain("getArabicPlural } from '@/lib/arabic-plural'");
    });
});

describe('U2 — peakOrdersPhrase (OwnerCharts: ساعة الذروة)', () => {
    it('1/2/7/15 بأرقام غربية', () => {
        expect(peakOrdersPhrase(1)).toBe('طلب واحد');
        expect(peakOrdersPhrase(2)).toBe('طلبان');
        expect(peakOrdersPhrase(7)).toBe('7 طلبات');
        expect(peakOrdersPhrase(15)).toBe('15 طلبًا');
    });

    it('حارس التوصيل: الموضعان (الملخص + سطر الذروة) يستخدمان المساعد', () => {
        const s = src('src/app/(protected)/owner/OwnerCharts.tsx');
        expect(s.match(/peakOrdersPhrase\(peak\.count\)/g)?.length).toBe(2);
        // القالبان المكسوران القديمان (عدد خام + «N طلب»)
        expect(s).not.toContain('${peak.count} طلب');
        expect(s).not.toContain('toArabicNumber(peak.count)} طلب');
    });
});

describe('U2 — foundItemsPhrase (MenuPageClient: «عُثر على …»)', () => {
    it('1/2/5/12', () => {
        expect(foundItemsPhrase(1)).toBe('صنف واحد');
        // r138-exec-2 (J4): المثنى مجرور بعد «عُثر على» — كان «صنفان» (مرفوع)
        expect(foundItemsPhrase(2)).toBe('صنفين');
        expect(foundItemsPhrase(5)).toBe('5 أصناف');
        expect(foundItemsPhrase(12)).toBe('12 صنفًا');
    });

    it('حارس التوصيل: القالب الثابت زال والمساعد مستخدم', () => {
        const s = src('src/components/menu/MenuPageClient.tsx');
        // r138-exec-2 (J4): «عُثر على» (مبني للمجهول) بدل «تم العثور على»
        expect(s).toContain('عُثر على ${foundItemsPhrase(filteredItems.length)}');
        expect(s).not.toContain('تم العثور على ${toArabicNumber(filteredItems.length)} صنف');
        expect(s).not.toContain('تم العثور على ${foundItemsPhrase');
    });
});

describe('U2 — ordersBalancePhrase (redeem API: «رصيدك: …»)', () => {
    it('1/2/5/12 — الدالة صالحة للخادم (Intl.PluralRules في Node)', () => {
        expect(ordersBalancePhrase(1)).toBe('طلب واحد');
        expect(ordersBalancePhrase(2)).toBe('طلبان');
        expect(ordersBalancePhrase(5)).toBe('5 طلبات');
        expect(ordersBalancePhrase(12)).toBe('12 طلبًا');
    });

    it('حارس التوصيل: رسالة النجاح تمر بالمساعد', () => {
        const s = src('src/app/api/loyalty/redeem/route.ts');
        expect(s).toContain('رصيدك: ${ordersBalancePhrase(result.totalOrders)}');
        expect(s).not.toContain('رصيدك: ${toArabicNumber(result.totalOrders)} طلبات');
    });
});

describe('U2 — menusLimitPhrase (SubscribeForm: «خطتك تدعم حتى …»)', () => {
    it('2/3/12 — المثنى وجمع القلة وإفراد 11+', () => {
        expect(menusLimitPhrase(2)).toBe('منيوين');
        expect(menusLimitPhrase(3)).toBe('3 منيوهات');
        expect(menusLimitPhrase(12)).toBe('12 منيوًا');
    });

    it('حارس التوصيل: القالب الثابت «N منيوهات» زال', () => {
        const s = src('src/app/(protected)/subscribe/SubscribeForm.tsx');
        expect(s).toContain('حتى ${menusLimitPhrase(maxMenus)}');
        expect(s).not.toContain('حتى ${toArabicNumber(maxMenus)} منيوهات');
    });
});

// ── U3: أرقام غربية موحدة + صياغة SSR-stable ─────────────────────────────

describe('U3 — شريط الثقة في HomePage: الأرقام الحية بأرقام غربية SSR (r128-F1b)', () => {
    // React يفصل العقد النصية عن التعابير بعلامات <!-- --> — ننزعها لقراءة النص المصيّر
    const html = renderToString(
        createElement(HomePage, { initialStats: { totalRestaurants: 1234, totalUsers: 5678 } })
    ).replace(/<!-- -->/g, '');

    it('«+1234» و«+5678» بأرقام غربية بلا فاصل آلاف (سياسة format.ts)', () => {
        expect(html).toContain('+1234');
        expect(html).toContain('+5678');
        // لا أرقام هندية (كان toLocaleString("ar") يخرج ١٢٣٤)
        expect(html).not.toMatch(/[٠-٩]/);
        // لا فاصل آلاف ICU (خطر mismatch عند ≥1000)
        expect(html).not.toContain('1,234');
        expect(html).not.toContain('5,678');
    });

    it('حارس المصدر: لا استدعاء .toLocaleString( في أسطح أرقام الهبوط', () => {
        // نستهدف الاستدعاء البرمجي فقط (برنامج مسبوق بنقطة) — التعليقات التوثيقية
        // تذكر المنسّق القديم نصًا ولا تُعد كودًا
        expect(src('src/components/landing/HomePage.tsx')).not.toMatch(/\.toLocaleString\(/);
        /* r142: ProgressSection تقاعد بدمج شريط الثقة في HomePage —
           الحارس يركب الأسطح الحية (HomePage + MenuShowcaseSection). */
        expect(src('src/components/landing/MenuShowcaseSection.tsx')).not.toMatch(/\.toLocaleString\(/);
    });
});
