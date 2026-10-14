/**
 * P13-2b (T4) — خريطة عرض الخطط، وحدة واحدة لكل الأسطح.
 *
 * كان الاسم→(أيقونة/شريحة/شارة) معرّفًا ثلاث مرات يدويًا (PricingClient
 * PLAN_META · PlanSelector PLAN_META · SubscribeForm PLAN_ICONS — كل واحدة
 * بأسماء الخطط الخمسة صريحةً) فأيّ خطة جديدة أو تغيير أيقونة كان يقع على
 * ثلاث جهات لتنجو واحدة. الآن المصدر واحد هنا والأسطح الثلاثة تستورده:
 * المصفوفة مفاتيحها اسم الخطة المحمول (name) لا الفهرس — تنجو من إعادة
 * الترتيب/الإضافة، وغير المعروف يسقط على عرض Free (لا بئر أيقونة فارغة).
 */
import { Sparkles, Star, Crown, Building2, type LucideIcon } from 'lucide-react';

export interface PlanMetaEntry {
        /** أيقونة الخطة (موحّدة عبر كل الأسطح — Enterprise كان سابقًا بلا أيقونة → بئر أبيض فارغ). */
        icon: LucideIcon;
        /** صنف بئر الأيقونة — عائلة البطاقات المسطّحة (r128-F5 / Phase 6: بلا تدرّج). */
        chip: string;
        /** يرفع شارة «الأكثر شعبية» على /subscribe (Basic — r120 U11-P2-4 توحيد النص). */
        recommended?: boolean;
        /** شارة زاوية /pricing للبطاقات غير الشعبية ('' = بلا شارة). */
        badge: string;
        badgeColor: string;
}

/**
 * المصدر الوحيد — القيم حرفيًا ما كانت مبعثرةً في الأسطح الثلاثة قبل P13-2b
 * (refactor خالص: لا تغيير في أي صنف أو نص يُعرض).
 */
export const PLAN_META: Record<string, PlanMetaEntry> = {
        Free: {
                icon: Sparkles,
                chip: 'bg-muted text-muted-foreground',
                badge: '',
                badgeColor: '',
        },
        Basic: {
                icon: Star,
                chip: 'bg-orange-muted text-orange',
                recommended: true,
                /* r120 (U11-P2-4): توحيد الشارة مع /subscribe — «الأكثر شعبية»
                   في كل مكان؛ «الأكثر طلباً» تعبير غير دقيق للخطط. */
                badge: 'الأكثر شعبية',
                badgeColor: 'bg-orange text-orange-foreground',
        },
        Premium: {
                icon: Crown,
                chip: 'bg-orange-muted text-orange',
                badge: 'الأفضل قيمة',
                /* r128-F5 (§4 flat cards): شارة مسطّحة — تدرّجا الشارة
                   أُزيل (منع التدرّجات)، لون صلب واحد يكفي. */
                badgeColor: 'bg-orange text-orange-foreground',
        },
        Pro: {
                icon: Building2,
                chip: 'bg-orange-muted text-orange',
                badge: '',
                badgeColor: '',
        },
        Enterprise: {
                icon: Building2,
                chip: 'bg-orange-muted text-orange',
                badge: 'للشركات الكبرى',
                badgeColor: 'bg-primary text-primary-foreground',
        },
};

/** الأسماء غير المعروفة تسقط على عرض Free — أيقونة دائمًا، بلا بئر فارغ. */
export const DEFAULT_PLAN_META: PlanMetaEntry = PLAN_META.Free;
