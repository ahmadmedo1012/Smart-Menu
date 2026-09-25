import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { formatPrice, toArabicNumber } from '@/lib/format';
import { getRestaurantBySlug } from '@/lib/menu-queries';
import { PrintButton } from './print-button';
import type { Metadata } from 'next';

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
         * من قالب العنوان الأب) — تبسيط إلى صيغة بلا تكرار. */
        return { title: restaurant ? `${restaurant.name} — نسخة للطباعة` : 'طباعة المنيو' };
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
                },
        });
        if (!restaurant) notFound();

        // round86-B10: slim item select — the unselected include shipped the image
        // column (up to 7MB data-URLs per item) for a page that renders zero images
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
                                select: { id: true, name: true, nameAr: true, description: true, descriptionAr: true, price: true, discountedPrice: true },
                        },
                },
        });

        const totalItems = categories.reduce((a, c) => a + c.items.length, 0);

        /* r120 (U12-P2-3): منتج «منيو QR» بلا كود QR على الورقة المطبوعة — الكود
         * يعيد العميل من الورقة إلى المنيو الرقمي والطلب المباشر على واتساب. */
        const menuUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://menu.smart-link.ly'}/menu/${slug}`;
        const qrDataUrl = await QRCode.toDataURL(menuUrl, {
                width: 224,
                margin: 1,
                color: { dark: '#1a1a1a', light: '#ffffff' },
        });

        return (
                <div className="print-sheet">
                        <style>{`
          .print-sheet {
            --print-foreground: oklch(0.2 0.02 85);
            --print-background: oklch(1 0 0);
            /* round94 (D/A4-A7) — تباينات AA على الورق الأبيض (قياسات تقرير D §1.د):
               primary 3.88→5.87 · amber-500 نص 2.56 (استبدلناه بالروابط/الزر) ·
               muted 2.00→4.86 · desc 3.96→6.02 · footer 3.24→6.02. */
            --print-primary: oklch(0.52 0.18 50);
            --print-amber-500: oklch(0.72 0.14 65);
            --print-amber-700: oklch(0.55 0.12 55);
            --print-muted: oklch(0.55 0.02 75);
            --print-border: oklch(0.85 0.03 70);
            --print-sub: oklch(0.5 0.025 70);
            --print-desc: oklch(0.5 0.025 70);
            --print-footer: oklch(0.5 0.025 70);
          }
          /* الأنماط محصورة تحت .print-sheet — النسخة القديمة كانت تعيد ضبط * وbody
             على مستوى المستند كله فتتصادم مع هيكل التطبيق الذي يغلف الصفحة. */
          .print-sheet, .print-sheet * { margin: 0; padding: 0; box-sizing: border-box; }
          .print-sheet {
            font-family: 'Traditional Arabic', 'Noto Naskh Arabic', serif;
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
          .print-sheet .item { display: flex; justify-content: space-between; padding: 0.3rem 0; font-size: 0.95rem; }
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
                        <p className="sub">
                                {restaurant.phone && <> 📞 {restaurant.phone} </>}
                                {restaurant.workingHours && <> 🕐 {restaurant.workingHours}</>}
                        </p>
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
                                                        </div>
                                                ))
                                        )}
                                </div>
                        ))}

                        {/* r120 (U12-P2-3): كود QR في ذيل الورقة — امسح واطلب. */}
                        <div style={{ textAlign: 'center', marginTop: '2.5rem', pageBreakInside: 'avoid' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
