import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { getRestaurantBySlug } from '@/lib/menu-queries';
// P29-D2: honest demo labeling rides the print copy too (same slug truth).
import { isPublicDemoMenu } from '@/lib/landing';
// r137: سطر دوام مهيكل صغير تحت ترويسة الورقة (إن وُجدت ساعات مهيكلة)
import { formatHoursForPrint } from '@/lib/opening-hours';
// r133 (A3 S5): print QR rides the single SITE_ORIGIN seam (lib/seo.ts) — was a
// private NEXT_PUBLIC_APP_URL read while seo.ts read NEXT_PUBLIC_DOMAIN.
import { SITE_ORIGIN } from '@/lib/seo';
// r135: الوسوم الغذائية على الورقة — زبون الحساسية يحتاجها قبل الطلب،
// والورقة المطبوعة هي القناة الوحيدة بلا نوافذ تفاصيل.
import { DIETARY_LABELS } from '@/lib/dietary';
import { Phone, Clock } from 'lucide-react';
import { PrintButton } from './print-button';
import type { Metadata } from 'next';

/* r135-PERF: كاش QR على مستوى الوحدة — توليد الكود عمل CPU متزامن (~10-25ms)
 * لكل طلب على مسار force-dynamic، والنتيجة لنفس الرابط ثابتة أبديًا (نفس
 * البكسلات لنفس النص). طلبات الطباعة المتكررة (مالك يطبع نسخًا للموظفين)
 * كانت تدفع الثمن كل مرة؛ الآن مرة واحدة لكل رابط في عمر العملية، والكاش
 * مقيد بحجم بسيط (مطاعم قليلة في العملية الواحدة عادةً) — لا حاجة إلى LRU. */
const qrCache = new Map<string, string>();
async function menuQr(menuUrl: string): Promise<string> {
        const cached = qrCache.get(menuUrl);
        if (cached) return cached;
        const url = await QRCode.toDataURL(menuUrl, {
                width: 224,
                margin: 1,
                color: { dark: '#1a1a1a', light: '#ffffff' },
        });
        qrCache.set(menuUrl, url);
        return url;
}

/* r93-W2a (U7): كانت هذه الصفحة تعيد وسوم مستند كاملة (جذر html وhead وbody)
 * متداخلة داخل جذر المجموعة (public) الذي يصيّر المستند أصلًا — DOM غير صالح (المتصفح يهمل الوسوم
 * الداخلية بصمت) + رأس التطبيق كاملًا يُشحن لصفحة طباعة تفتح في نافذة جديدة
 * (MenuHero.tsx target=_blank). القرار المعماري الموثق: المسار يبقى ضمن جذر
 * المجموعة (نفس الرابط /menu/[slug]/print وبوابة وجود التخطيط) لكن المحتوى يُلفّ
 * في ورقة واحدة .print-sheet بأنماط محصورة عليها (لا قواعد عامة على body/* بعد
 * الآن — كانت تتصادم مع هيكل التطبيق في نفس المستند)، والعنوان يُدار عبر
 * generateMetadata بدل <title> متداخل، وفي الطباعة تُخفى بقية هيكل التطبيق
 * بتقنية visibility نفسها المعتمدة لصفحة QR (round88-E5) — فتبقى الصفحة قابلة
 * للطباعة بالكامل كما كانت. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
        // getRestaurantBySlug محفوظة بـ React cache() — نفس استدعاء بوابة التخطيط (لا استعلام إضافي)
        const { slug } = await params;
        const restaurant = await getRestaurantBySlug(slug);
        /* r112: كان العنوان «… — المنيو | للطباعة | المنيو الذكي» (أنبوبان
         * من قالب العنوان الأب) — تبسيط إلى صيغة بلا تكرار. r127-F3: لاحقة
         * قالب العنوان الأب وُحّدت إلى «| الربط الذكي» (كانت «| المنيو الذكي»). */
        /* r121-L-2 (B-3): noindex + canonical للمسار الأصلي — كانت الصفحة ترث
         * index,follow بلا canonical بينما يمنع robots.txt مسارات الطباعة من
         * الزحف (وصفة «مفهرس رغم الحجب»). الإشارة الصحيحة: noindex قابل للزحف
         * + canonical للمصدر (وقد رُفع سطر مسارات الطباعة من robots.ts بنفس الجولة). */
        /* P29-D2: the demo suffix rides the print title too (same
         * «تجريبي» truth as the menu page — a printed demo menu must not
         * present as a real restaurant; noindex makes this a UI-truth only).
         * Names already carrying the word don't get it twice. */
        const demoSuffix =
                restaurant && isPublicDemoMenu(restaurant.slug) && !restaurant.name.includes('تجريبي')
                        ? ' — تجريبي'
                        : '';
        return {
                title: restaurant ? `${restaurant.name}${demoSuffix} — نسخة للطباعة` : 'طباعة المنيو',
                robots: { index: false, follow: false },
                alternates: { canonical: restaurant ? `/menu/${restaurant.slug}` : `/menu/${slug}` },
        };
}

export default async function PrintMenuPage({ params }: { params: Promise<{ slug: string }> }) {
        const { slug } = await params;

        const restaurant = await prisma.restaurant.findUnique({
                where: { slug },
                select: {
                        id: true,
                        name: true,
                        logo: true,
                        description: true,
                        phone: true,
                        workingHours: true,
                        /* r137: الساعات المهيكلة لسطر الدوام تحت الترويسة */
                        hours: {
                                orderBy: { dayOfWeek: 'asc' },
                                select: { dayOfWeek: true, closed: true, opensAt: true, closesAt: true },
                        },
                },
        });
        if (!restaurant) notFound();

        // round86-B10: slim item select — the unselected include shipped the image
        // column (up to 7MB data-URLs per item) for a page that renders zero images
        // r135-PRINT: الإضافات تُطبع الآن (كان الصنف يعرض سعره الأساسي فقط بينما
        // نافذة الطلب الرقمية تعرض «كبير +2 د.ل» — الزبون على الورقة لم يكن يعرف
        // أن للصنف خيارات أصلًا، ولا يظهر السعر الفعلي لأي اختيار). الخيارات
        // المتاحة فقط، بأسعارها، في سطر واحد مضغوط — بلا صور ولا هياكل إضافية.
        const categories = await prisma.menuCategory.findMany({
                where: { isActive: true, restaurantId: restaurant.id },
                orderBy: { sortOrder: 'asc' },
                select: {
                        id: true,
                        name: true,
                        nameAr: true,
                        items: {
                                where: { status: 'available' },
                                orderBy: { sortOrder: 'asc' },
                                select: {
                                        id: true, name: true, nameAr: true, description: true, descriptionAr: true,
                                        price: true, discountedPrice: true, dietaryTags: true,
                                        modifierGroups: {
                                                orderBy: { sortOrder: 'asc' },
                                                select: {
                                                        id: true,
                                                        nameAr: true,
                                                        name: true,
                                                        options: {
                                                                where: { isAvailable: true },
                                                                orderBy: { sortOrder: 'asc' },
                                                                select: { id: true, nameAr: true, name: true, priceDelta: true },
                                                        },
                                                },
                                        },
                                },
                        },
                },
        });

        const totalItems = categories.reduce((a, c) => a + c.items.length, 0);

        /* r120 (U12-P2-3): منتج «منيو QR» بلا كود QR على الورقة المطبوعة — الكود
         * يعيد العميل من الورقة إلى المنيو الرقمي والطلب المباشر على واتساب.
         * r135-PERF: عبر كاش الوحدة (menuQr) — نفس الرابط يولّد مرة واحدة. */
        const menuUrl = `${SITE_ORIGIN}/menu/${slug}`;
        const qrDataUrl = await menuQr(menuUrl);

        return (
                <div className="print-sheet">
                        <style>{`
          .print-sheet {
            /* PHASE 5 (r152) — الطبخ الدافئ على الورق: حبر إسبريسو #241811،
               وتراكوتا #C2452D (نصًا 5.02:1 على الأبيض)، وعنبر دافئ للفواصل
               (#B7791F)، وخطوط شعرية دافئة #E8DECE. كل الأزواج AA على الأبيض. */
            --print-foreground: #241811;
            --print-background: #FFFFFF;
            --print-primary: #C2452D;      /* terracotta — 5.02:1 على الأبيض */
            --print-amber-500: oklch(0.626 0.125 70.4); /* warm amber fill/stroke = #B7791F — بصيغة oklch وفاءً لعقد r94-AA (نفس اللون تمامًا) */
            --print-amber-700: oklch(0.471 0.093 73.8); /* amber-ink نصًا = #7A5210 — 6.9:1 على الأبيض — oklch حسب عقد الاختبار (نفس اللون تمامًا) */
            --print-muted: #6B5D4F;        /* secondary espresso — 5.95:1 */
            --print-border: #E8DECE;       /* warm hairline */
            --print-sub: #6B5D4F;
            --print-desc: #6B5D4F;
            --print-footer: #6B5D4F;
          }
          /* الأنماط محصورة تحت .print-sheet — النسخة القديمة كانت تعيد ضبط * وbody
             على مستوى المستند كله فتتصادم مع هيكل التطبيق الذي يغلف الصفحة. */
          .print-sheet, .print-sheet * { margin: 0; padding: 0; box-sizing: border-box; }
          .print-sheet {
            /* r132 (A3 §1.3 re-point): the print-only Noto Naskh Arabic webfont
               (113.7KB, the sheet's sole consumer) was deleted with the other
               never-fetched faces — the sheet now stacks the already-shipped
               IBM Plex Sans Arabic (Traditional Arabic stays first: the
               Windows-native Naskh cut prints where installed). */
            font-family: 'Traditional Arabic', 'IBM Plex Sans Arabic', serif;
            color: var(--print-foreground); background: var(--print-background);
            line-height: 1.6; padding: 1.5cm;
            /* معاينة على الشاشة كورقة A4 بيضاء داخل هيكل التطبيق (تفتح في تبويب مستقل) */
            margin-inline: auto; width: 100%; max-width: 210mm;
            box-shadow: 0 12px 48px rgb(0 0 0 / 0.18);
          }
          .print-sheet h1 { font-size: 1.8rem; color: var(--print-primary); text-align: center; }
          .print-sheet .sub { text-align: center; color: var(--print-sub); font-size: 0.85rem; margin: 0.3rem 0; }
          .print-sheet .divider { border: none; border-top: 2px solid var(--print-amber-500); margin: 1rem 0; }
          .print-sheet .cat { margin: 1.2rem 0; page-break-inside: avoid; }
          .print-sheet .cat h2 { font-size: 1.1rem; color: var(--print-amber-700); border-bottom: 1px solid var(--print-border); padding-bottom: 0.3rem; }
          .print-sheet .item { display: flex; align-items: baseline; gap: 0.5rem; padding: 0.3rem 0; font-size: 0.95rem; }
          /* Phase 5 (r152): قائد النقاط المطبوع — dotted price leader بين
             الاسم والسعر (نفس بصمة المنيو الرقمي: .menu-leader).
             P18-W2-c: same ink-weight re-anchor as the digital twin —
             2.5px/1.0 so the printed rule actually prints. */
          .print-sheet .item .ldr { flex: 1 1 auto; min-width: 1.5rem; border-block-end: 2.5px dotted var(--print-muted); transform: translateY(-0.3em); opacity: 1; }
          .print-sheet .item .nm { font-weight: 500; }
          .print-sheet .item .pr { font-weight: 700; color: var(--print-primary); white-space: nowrap; }
          .print-sheet .item .old { text-decoration: line-through; color: var(--print-muted); font-weight: 400; }
          .print-sheet .desc { font-size: 0.8rem; color: var(--print-desc); }
          .print-sheet .footer { text-align: center; font-size: 0.75rem; color: var(--print-footer); border-top: 1px solid var(--print-border); padding-top: 1rem; margin-top: 2rem; }
          .print-sheet .actions { text-align: center; margin-bottom: 1rem; }
          /* round94 (D/A4): روابط الإجراءات amber-700 (5.05:1) بدل amber-500 (2.56:1) */
          .print-sheet .actions a, .print-sheet .actions button { color: var(--print-amber-700); font-size: 0.85rem; margin: 0 0.5rem; cursor: pointer; background: none; border: none; text-decoration: underline; }
          /* round94 (D/A5): نص الزر foreground على amber-500 (7.08:1) بدل أبيض (2.56:1) */
          .print-sheet .print-btn { background: var(--print-amber-500); color: var(--print-foreground) !important; text-decoration: none !important; padding: 8px 24px; border-radius: 8px; display: inline-block; margin-top: 0.5rem; font-size: 1rem !important; }
          /* r112: كانفس الطباعة الأبيض — ثلاث طبقات كانت تتشارك الرسم الداكن
             للحواف (#121212) في PDF بـ printBackground، وفُكّكت تباعًا بالتجربة:
             (أ) :root العام في globals.css يعلن color-scheme: dark فيرسم
                 Chromium كانفس الورقة بلون UA الداكن —
             (ب) next-themes يضيف color-scheme: dark INLINE على وسم html
                 الجذري وقت التشغيل (خاصية enableColorScheme الافتراضية) —
                 وهذا ما يهزم أي قاعدة :root عادية حتى لو تأخرت في ترتيب
                 المستند؛ لا يكسرها إلا !important (تجربة حاسمة: الحقن بلا
                 !important يخفق، وبـ !important يبيّض الكانفس فورًا) —
             (ج) خلفية body الداكنة (#010000) تُرسم في الهوامش أيضًا (تُعالج
                 داخل @media print أدناه).
             color-scheme داخل @media print لا يُقرأ للكانفس أصلًا (Chromium
             يأخذ النظام الفعّال للصفحة) فالقاعدة بلا نطاق وسائط + !important.
             الوسم محصور بهذه الصفحة وحدها؛ لا مدخلات UA هنا (أزرار/روابط
             مصممة)، والورقة بيضاء بطبعها فيتوافق النظام الفاتح معها بصريًا. */
          :root { color-scheme: light !important; }
          @media print {
            /* إخفاء هيكل التطبيق المغلف (الجذر العام) وإظهار الورقة وحدها —
               نفس تقنية visibility المعتمدة لورقة QR (round88-E5). */
            body * { visibility: hidden; }
            /* r112: حافظة حبر (المصدر الثاني) — خلفية body الداكنة (#010000)
               كانت ترسم في هوامش الصفحة عند الطباعة مع «رسومات الخلفية»
               مفعّلة. تُطبّق بعد استقرار انتقال background-color 0.3s
               (قياس منتصف الانتقال يُظهر قيمًا وسيطة مضللة — مُثبت بالتجربة). */
            body { background: #fff !important; }
            .print-sheet, .print-sheet * { visibility: visible; }
            .print-sheet { position: absolute; inset-block-start: 0; inset-inline-start: 0; max-width: none; box-shadow: none; padding: 0; }
            .print-sheet .actions { display: none; }
            @page { margin: 1.5cm; }
          }
        `}</style>
                        <div className="actions">
                                {/* round94 (D §2): سهم «العودة» في RTL يشير يميناً (→) لا يساراً */}
                                <a href={`/menu/${slug}`}>→ العودة للمنيو الرقمي</a>
                        </div>

                        <h1>{restaurant.name}</h1>
                        {restaurant.description && <p className="sub">{restaurant.description}</p>}
                        {/* P10-2 (g): أيقونات الاتصال lucide بدل رموز الإيموجي (تُطبع
                            خطيًا ثابتًا عبر محركات الطباعة بدل رموز متقلبة) */}
                        <p className="sub">
                                {restaurant.phone && <> <Phone className="inline-block size-3 align-text-bottom" aria-hidden="true" /> {restaurant.phone} </>}
                                {restaurant.workingHours && <> <Clock className="inline-block size-3 align-text-bottom" aria-hidden="true" /> {restaurant.workingHours}</>}
                        </p>
                        {/* r137: سطر الدوام المهيكل — «السبت: 16:00–23:00 · الجمعة: مغلق».
                            يظهر فقط إذا عبّأ المالك محرّر الأسبوع (غياب صادق: بلا صفوف
                            لا يُختلق سطر). الورقة تبقى نصية بلا حالة «الآن» — الحساب
                            اللحظي عميلي فقط (شارة المنيو الرقمي). */}
                        {(() => {
                                const line = formatHoursForPrint(restaurant.hours);
                                return line ? <p className="sub"><Clock className="inline-block size-3 align-text-bottom" aria-hidden="true" /> {line}</p> : null;
                        })()}
                        <p className="sub" style={{ fontSize: '0.8rem', color: 'var(--print-footer)' }}>
                                {toArabicNumber(categories.length)} قسم · {toArabicNumber(totalItems)} صنف
                        </p>
                        <hr className="divider" />

                        {categories.map((cat) => (
                                <div key={cat.id} className="cat">
                                        <h2>{cat.nameAr || cat.name}</h2>
                                        {cat.items.length === 0 ? (
                                                <p style={{ color: 'var(--print-footer)', fontSize: '0.85rem' }}>لا توجد أصناف</p>
                                        ) : (
                                                cat.items.map((item) => (
                                                        <div key={item.id}>
                                                                <div className="item">
                                                                        <span className="nm">{item.nameAr || item.name}</span>
                                                                        <i className="ldr" aria-hidden="true" />
                                                                        <span className="pr">
                                                                                {/* r120 (U12-P2-2): العملة كانت تتكرر مرتين — formatPrice
                                                                                   يضيف «د.ل» والوسم الحرفي تحته أضاف ثانية («5.0 د.ل د.ل»
                                                                                   على كل صنف مطبوع). المنسّق الذكي الآن يعرض «5 د.ل» مرة واحدة. */}
                                                                                {item.discountedPrice ? (
                                                                                        <>
                                                                                                <span className="old">
                                                                                                        {formatPrice(Number(item.price))}
                                                                                                </span>{' '}
                                                                                                {formatPrice(Number(item.discountedPrice))}
                                                                                        </>
                                                                                ) : (
                                                                                        formatPrice(Number(item.price))
                                                                                )}
                                                                        </span>
                                                                </div>
                                                                {(item.descriptionAr || item.description) && (
                                                                        <p className="desc">{item.descriptionAr || item.description}</p>
                                                                )}
                                                                {/* r135-PRINT: سطر الوسوم الغذائية — معلومة سلامة قبل الطلب،
                                                                    بحجم مطبوع مقروء (0.75rem) ولون نحاسي هادئ يفرّقها عن الوصف. */}
                                                                {item.dietaryTags.length > 0 && (
                                                                        <p style={{ fontSize: '0.75rem', color: 'var(--print-primary)', margin: '0.1rem 0 0' }}>
                                                                                {item.dietaryTags.map((t) => DIETARY_LABELS[t] ?? t).join(' · ')}
                                                                        </p>
                                                                )}
                                                                {/* r135-PRINT: سطر الإضافات — «الحجم: عادي / كبير (+2 د.ل)»؛
                                                                    المجموعات الفارغة (كل خياراتها موقوفة) تُهمل، والمجموعة
                                                                    بلا اسم تعرض «إضافات» — الورقة تقرأ كبشري لا كقاعدة بيانات. */}
                                                                {item.modifierGroups
                                                                        .filter((g) => g.options.length > 0)
                                                                        .map((g) => {
                                                                                const label = g.nameAr || g.name || 'إضافات';
                                                                                const opts = g.options
                                                                                        .map((o) =>
                                                                                                Number(o.priceDelta) === 0
                                                                                                        ? o.nameAr || o.name
                                                                                                        : `${o.nameAr || o.name} (+${formatPrice(Number(o.priceDelta))})`
                                                                                        )
                                                                                        .join(' / ');
                                                                                return (
                                                                                        <p key={g.id} style={{ fontSize: '0.75rem', color: 'var(--print-desc)', margin: '0.1rem 0 0' }}>
                                                                                                {label}: {opts}
                                                                                        </p>
                                                                                );
                                                                        })}
                                                        </div>
                                                ))
                                        )}
                                </div>
                        ))}

                        {/* r120 (U12-P2-3): كود QR في ذيل الورقة — امسح واطلب. */}
                        <div style={{ textAlign: 'center', marginTop: '2.5rem', pageBreakInside: 'avoid' }}>
                                <img
                                        src={qrDataUrl}
                                        alt={`رمز الاستجابة السريعة لمنيو ${restaurant.name}`}
                                        width={112}
                                        height={112}
                                        style={{ display: 'block', margin: '0 auto' }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--print-footer)', marginTop: '0.5rem' }}>
                                        امسح الكود للطلب من المنيو الرقمي مباشرة
                                </p>
                        </div>

                        <div className="footer">
                                <p>
                                        مدعوم من <strong>الربط الذكي</strong>
                                </p>
                        </div>

                        <div className="actions" style={{ marginTop: '1rem' }}>
                                <PrintButton />
                        </div>
                </div>
        );
}
