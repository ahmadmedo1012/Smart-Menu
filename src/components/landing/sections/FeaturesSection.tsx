"use client"

import { Smartphone, BarChart3, QrCode, Gift, MessageCircle, CheckCircle, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

const features = [
        { title: "سرعة وسلاسة", icon: Smartphone, desc: "تجربة تصفح سريعة وسلسة على جميع الأجهزة" },
        { title: "طرق طلب متعددة", icon: MessageCircle, desc: "واتساب · استلام · توصيل · حجز وانتظار" },
        { title: "تسجيل العملاء", icon: CheckCircle, desc: "تسجيل دخول العملاء برقم الجوال بخطوة واحدة" },
        { title: "تحكم كامل", icon: BarChart3, desc: "لوحة تحكم باللغة العربية · تعديل وإدارة بسهولة" },
        { title: "QR كود مخصص", icon: QrCode, desc: "QR مخصص بألوان وشعار مطعمك" },
        { title: "برنامج ولاء", icon: Gift, desc: "برنامج ولاء ومكافآت لعملائك الأوفياء" },
]

/* r95: إحصاءات مصغرة لبطاقة البطل (bento SmartBot §5.2) — نوعية مشتقة من
 * الميزة نفسها بلا أرقام تسويقية (سياسة الصدق r82: لا اختلاق مقاييس). */
const HERO_FEATURE_STATS = [
        { value: "فوري", label: "تحميل المنيو" },
        { value: "بدون تثبيت", label: "يعمل من المتصفح" },
        { value: "متجاوب", label: "على كل الأجهزة" },
]

export function FeaturesSection() {
        return (
                <SectionContainer tone="alt">
                        <ScrollReveal y={20}>
                                {/* r95: الإيقاع الموحد — رأس مركزي + فاصل متدرج (SectionHeader) */}
                                <SectionHeader title="كل ما يحتاجه مطعمك في مكان واحد" subtitle="منيو واضح للزبون، طلب مرتب على واتساب، وأدوات تمنحك صورة أفضل عن عملك." />
                        </ScrollReveal>

                        {/* r95: bento SmartBot — شبكة 4 أعمدة بصفوف minmax (§5.3) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(180px,auto)] gap-3 sm:gap-4">
                                {features.map((feat, i) => {
                                        // The first feature anchors the grid as the 2×2 bento hero
                                        const isHero = i === 0
                                        // The last card closes the grid as a full-width strip (bento balance)
                                        const isWide = i === features.length - 1
                                        return (
                                        <ScrollReveal
                                                key={i}
                                                y={24}
                                                delay={i * 60}
                                                className={cn(
                                                        isHero && "lg:col-span-2 lg:row-span-2",
                                                        isWide && "sm:col-span-2 lg:col-span-4",
                                                )}
                                        >
                                                <div
                                                        className={cn(
                                                                "group relative h-full p-5 sm:p-6 transition-[border-color,background-color,box-shadow] duration-500 hover:shadow-lg hover:shadow-accent-foreground/10",
                                                                isHero
                                                                        ? /* r95: bento hero — حد accent + تدرج زاوية (§5.2) */
                                                                          "rounded-2xl border border-accent-foreground/30 bg-gradient-to-br from-accent-foreground/[0.04] via-card to-card"
                                                                        : "rounded-2xl bg-card border border-border/50 hover:border-accent-foreground/30",
                                                        )}
                                                >
                                                        {isHero && (
                                                                <>
                                                                        {/* r95: توهج زاوية خلفي (§5.2) */}
                                                                        <div aria-hidden="true" className="absolute -top-20 -end-20 size-48 rounded-full bg-accent-foreground/10 blur-3xl" />
                                                                        {/* r95 → r120 (U11-P2-4): «الأكثر شعبية» — موحّدة مع صفحتي
                                                                            الخطط؛ «الأكثر طلباً» غير دقيقة لميزة. */}
                                                                        <div className="absolute top-4 end-4 text-[0.625rem] font-bold px-2.5 py-1 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
                                                                                <Zap className="size-2.5 fill-current" aria-hidden="true" />
                                                                                الأكثر شعبية
                                                                        </div>
                                                                </>
                                                        )}
                                                        <div className={cn(
                                                                "relative z-10 flex h-full flex-col",
                                                                isWide && "sm:flex-row sm:items-center sm:gap-5",
                                                        )}>
                                                                {/* r95: شريحة أيقونة SmartBot — بلا ring (§5.4) */}
                                                                <div className={cn(
                                                                        "flex items-center justify-center rounded-xl bg-accent-foreground/10 group-hover:bg-accent-foreground/15 group-hover:scale-110 transition-all duration-300",
                                                                        isHero ? "mb-5 size-11" : "mb-4 size-10 sm:size-11 shrink-0",
                                                                        isWide && "sm:mb-0",
                                                                )}>
                                                                        <feat.icon className="size-5 text-accent-foreground" />
                                                                </div>
                                                                {/* r95: النص — عمود flex حتى يُثبت صف الإحصاءات بقاع البطاقة البطل (mt-auto) */}
                                                                <div className={cn(
                                                                        "flex flex-col flex-1",
                                                                        isWide && "sm:flex-initial",
                                                                )}>
                                                                        <h3 className={cn(
                                                                                "mb-2 font-bold",
                                                                                isHero ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
                                                                                isWide && "sm:mb-1",
                                                                        )}>{feat.title}</h3>
                                                                        <p className={cn(
                                                                                "text-sm sm:text-base text-muted-foreground leading-relaxed",
                                                                                /* r95: حد أدنى للفجوة قبل صف الإحصاءات (mt-auto) عند ضيق البطاقة */
                                                                                isHero && "mb-5",
                                                                                isWide && "sm:mb-0",
                                                                        )}>
                                                                                {feat.desc}
                                                                        </p>

                                                                        {isHero && (
                                                                                /* r95: صف إحصاءات مصغرة أسفل البطاقة البطل (§5.2) —
                                                                                   mt-auto يثبته بقاع البطاقة عند تمددها (row-span-2)
                                                                                   وmb-5 في الوصف يضمن الحد الأدنى للفجوة على الجوال. */
                                                                                <div className="mt-auto pt-4 border-t border-accent-foreground/10 grid grid-cols-3 gap-2">
                                                                                        {HERO_FEATURE_STATS.map((stat) => (
                                                                                                <div key={stat.label}>
                                                                                                        <div className="text-sm font-bold text-accent-foreground leading-tight">{stat.value}</div>
                                                                                                        <div className="text-[0.625rem] text-muted-foreground mt-0.5">{stat.label}</div>
                                                                                                </div>
                                                                                        ))}
                                                                                </div>
                                                                        )}
                                                </div>
                                                </div>
                                                </div>
                                        </ScrollReveal>
                                        );
                                })}
                        </div>
                </SectionContainer>
        )
}
