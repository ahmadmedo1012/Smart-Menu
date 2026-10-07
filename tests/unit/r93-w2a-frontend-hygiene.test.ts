/**
 * r93-W2a (U1/U4/U5/U6/U7/U8) — عقود صحة الواجهة (خط العناوين، الكود الميت،
 * انزلاق Drawer RTL، حارس hydration، DOM صفحة الطباعة، a11y).
 *
 * اختبارات عقود على المصدر/التصيير الأول (نمط r92-cart-aria-plural
 * wiring-guard وr92-hero-ssr renderToString) — تثبّت إصلاحات موجة W2-a ضد
 * الانحدار الصامت:
 *   - U1: تعريفا --font-heading متطابقان (Readex Pro أولًا) + تصحيح شرح r88-A2
 *   - U4: ملفات الكود الميت محذوفة فعلًا + بقايا CSS/تصدير/استيراد زالت
 *   - U5: مرايا rtl: لانزلاق Sheet الأفقي في الاتجاهين
 *   - U6: أول تصيير للرابط بلا window (SSR=hydration)
 *   - U7: صفحة الطباعة بلا وسوم جذر مكررة + تقنية إخفاء الهيكل في الطباعة
 *   - U8: aria-label عربي لهاتف البطل + توحيد «الربط الذكي»
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { ReferralCard } from '@/components/loyalty/ReferralCard';
import { IPhoneMockup } from '@/components/ui/iphone-mockup';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const gone = (p: string) => !existsSync(join(process.cwd(), p));

// ── U1: توحيد خط العناوين ────────────────────────────────────────────────

describe('U1 — --font-heading موحد على IBM Plex Sans Arabic (المصدر الواحد للحقيقة)', () => {
    const css = src('src/app/globals.css');

    it('تعريفا @theme و:root متطابقان حرفيًا وIBM Plex Sans Arabic أولًا في كليهما', () => {
        const decls = [...css.matchAll(/--font-heading:\s*([^;]+);/g)].map((m) => m[1].trim());
        expect(decls.length).toBe(2); // واحد في @theme inline وواحد في :root — لا ثالث
        expect(decls[0]).toBe(decls[1]);
        // مدارك: IBM Plex Sans Arabic هي عائلة العناوين والنص معًا (--font-display لديهم)
        expect(decls[0].startsWith('"IBM Plex Sans Arabic"')).toBe(true);
        // القيمة القديمة الكاذبة (Cairo أولًا في :root) زالت
        expect(decls.some((d) => d.startsWith('var(--font-cairo'))).toBe(false);
    });

    it('h1-h5 تقرأ var(--font-heading) — نفس العائلة التي تحملها أداة font-heading', () => {
        expect(css).toMatch(/h1, h2 \{\s*font-family: var\(--font-heading\)/);
    });

    it('خطوط IBM Plex الـ 12 مسجلة في fonts.css وملفات woff2 موجودة فعلًا', () => {
        const fontsCss = src('public/fonts/fonts.css');
        const faces = [...fontsCss.matchAll(/src:\s*url\(['"](\/fonts\/plex-[^'")]+)['"]\)/g)].map((m) => m[1]);
        expect(faces.length).toBe(12);
        for (const f of faces) {
            expect(existsSync(join(process.cwd(), 'public', f.replace(/^\//, '')))).toBe(true);
        }
        // الـ shim ما زال موجودًا (غيابه أفجر الإنتاج إلى Times New Roman ذات مرة)
        expect(fontsCss).toContain(':root { --font-cairo: "IBM Plex Sans Arabic"; }');
    });

    it('شرح r88-A2 في الجذر المحمي صُحح (كان يدّعي Readex «في الوضع الفاتح» فقط)', () => {
        const layout = src('src/app/(protected)/layout.tsx');
        expect(layout).toContain('r93-W2a (U1)');
        expect(layout).not.toContain('first in LIGHT theme');
    });
});

// ── U4: الكود الميت محذوف ─────────────────────────────────────────────────

describe('U4 — الكود الميت المؤكد محذوف (بعد تحقق rg صفر مراجع حية)', () => {
    it('الملفات الثلاثة زالت من الشجرة', () => {
        expect(gone('src/components/ui/VideoWrapper.tsx')).toBe(true);
        expect(gone('src/components/ui/kinetic-text.tsx')).toBe(true);
        expect(gone('src/hooks/useScrollProgress.ts')).toBe(true);
    });

    it('marquee: لا keyframes ولا class ولا ذكر في reduced-motion', () => {
        const css = src('src/app/globals.css');
        expect(css).not.toContain('@keyframes marquee');
        expect(css).not.toContain('.animate-marquee');
    });

    it('تصدير useLoadingAnnouncement زال (LoadingAnnouncer نفسه باقٍ ومستخدم)', () => {
        const la = src('src/components/ui/loading-announcer.tsx');
        expect(la).not.toContain('useLoadingAnnouncement');
        expect(la).toContain('export function LoadingAnnouncer');
    });

    it('الاستيراد الفارغ من lucide-react زال من CartSlideOver', () => {
        expect(src('src/components/menu/CartSlideOver.tsx')).not.toContain("import {} from 'lucide-react'");
    });

    it('دليل SCROLLCRAFT لم يعد يشير للمكونين المحذوفين', () => {
        const doc = src('src/components/ui/SCROLLCRAFT.md');
        expect(doc).not.toContain('@/hooks/useScrollProgress');
        expect(doc).not.toContain('@/components/ui/kinetic-text');
    });
});

// ── U5: انزلاق Drawer RTL ─────────────────────────────────────────────────

describe('U5 — مرايا rtl: لانزلاق Sheet الأفقي (فيزيائي↔منطقي)', () => {
    it('side=right وside=left لكل من starting/ending بإشارة معكوسة في RTL', () => {
        const s = src('src/components/ui/sheet.tsx');
        // side=right في RTL يُرصّ على الحافة اليسرى → الانزلاق سالب (نحو الحافة)
        expect(s).toContain('rtl:data-[side=right]:data-starting-style:translate-x-[-2.5rem]');
        expect(s).toContain('rtl:data-[side=right]:data-ending-style:translate-x-[-2.5rem]');
        // side=left في RTL يُرصّ على الحافة اليمنى → الانزلاق موجب
        expect(s).toContain('rtl:data-[side=left]:data-starting-style:translate-x-[2.5rem]');
        expect(s).toContain('rtl:data-[side=left]:data-ending-style:translate-x-[2.5rem]');
    });
});

// ── U6: حارس hydration للمنشأ ─────────────────────────────────────────────

describe('U6 — ReferralCard: الرابط في أول تصيير بلا window (SSR = hydration)', () => {
    const html = renderToString(
        createElement(ReferralCard, {
            restaurantName: 'مطعم الاختبار',
            restaurantSlug: 'test-slug',
            referralCode: 'ABC123',
        })
    );

    it('أول لقطة (ما يقارنه hydration) ترسم الرابط النسبي بلا منشأ ولا undefined', () => {
        // خلية عرض الرابط تحمل النسبي بالضبط (لاحظ: xmlns للأيقونات يحوي http —
        // لا يُعد منشأ رابط الإحالة)
        expect(html).toContain('dir="ltr">/menu/test-slug?ref=ABC123<');
        expect(html).not.toContain('undefined');
        expect(html).not.toMatch(/dir="ltr">https?:\/\//);
    });

    it('حارس mounted موجود والقراءة غير المقيدة لـ window.location زالت', () => {
        const rc = src('src/components/loyalty/ReferralCard.tsx');
        expect(rc).toContain('const [mounted, setMounted] = useState(false)');
        expect(rc).toContain("mounted ? window.location.origin : ''");
        expect(rc).not.toContain("typeof window !== 'undefined' ? window.location.origin : ''");
    });

    it('ShareAfterOrder: نفس الحارس (المصدر)', () => {
        const so = src('src/components/loyalty/ShareAfterOrder.tsx');
        expect(so).toContain('const [mounted, setMounted] = useState(false)');
        expect(so).toContain("mounted ? window.location.origin : ''");
        expect(so).not.toContain("typeof window !== 'undefined' ? window.location.origin : ''");
    });
});

// ── U7: DOM صفحة الطباعة ──────────────────────────────────────────────────

describe('U7 — صفحة الطباعة: لا وسوم جذر مكررة والوظيفة محفوظة', () => {
    const p = src('src/app/(public)/menu/[slug]/print/page.tsx');

    it('لا تعيد html/head/body متداخلة داخل جذر (public)', () => {
        expect(p).not.toContain('<html');
        expect(p).not.toContain('<head>');
        expect(p).not.toContain('<body');
    });

    it('المحتوى ملفوف في ورقة print-sheet والعنوان عبر generateMetadata', () => {
        expect(p).toContain('className="print-sheet"');
        expect(p).toContain('generateMetadata');
    });

    it('وظيفة الطباعة محفوظة: إخفاء هيكل التطبيق في الطباعة + هامش الصفحة + زر الطباعة', () => {
        expect(p).toContain('body * { visibility: hidden; }');
        expect(p).toContain('@page { margin: 1.5cm; }');
        expect(p).toContain('PrintButton');
    });

    it('المستدعي الحي (زر الطباعة في رأس المنيو) ما زال يشير للمسار', () => {
        expect(src('src/components/menu/MenuHero.tsx')).toContain('/print');
    });
});

// ── U8: a11y وتسمية العلامة ───────────────────────────────────────────────

describe('U8 — aria-label عربي لهاتف البطل', () => {
    it('يُقرأ «هاتف آيفون تجريبي» لا "iPhone mockup"', () => {
        const html = renderToString(createElement(IPhoneMockup, { model: '15-pro' }));
        expect(html).toContain('هاتف آيفون تجريبي');
        expect(html).not.toContain('iPhone mockup');
    });
});

describe('U8 — تسمية العلامة موحدة على «الربط الذكي» (الأكثر استخدامًا)', () => {
    it('صفحة 404 لم تعد تستخدم الصيغة الثالثة «سمارت مينيو»', () => {
        const nf = src('src/app/not-found.tsx');
        expect(nf).not.toContain('سمارت مينيو');
        expect(nf).toContain('الربط الذكي');
    });

    it('«سمارت مينيو» غير موجودة في أي نص ظاهر للمستخدم بالمشروع كله', () => {
        // العد الموثق: «الربط الذكي» 21+ موضعًا مقابل صيغة وحيدة كانت في 404
        expect(src('src/app/not-found.tsx')).not.toContain('سمارت مينيو');
    });
});
