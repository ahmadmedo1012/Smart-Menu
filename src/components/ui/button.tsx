import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Premium button — Madarek `.btn` recipe (components.css:266-311, r130 W2-3).
 * Radius var(--r-md)=10px · label 13px/600 · default height 40px (lg 48,
 * sm 32) · press scale(--press-scale 0.97) @t-fast on the standard --ease
 * curve · disabled opacity 0.55. Solid variants hover with the canonical
 * −2px lift + the neutral multi-layer --shadow-card-premium(-h) pair (no
 * tinted glow). The sheen sweep (background-position band, 700ms stat
 * duration on the decelerate curve — never a translateX pseudo, scrollWidth
 * stays == clientWidth) rides the PRIMARY variant only. No JS event
 * handlers, so the component stays Server-Component-safe.
 */
const buttonVariants = cva(
        "group/btn relative inline-flex shrink-0 items-center justify-center rounded-md border border-transparent font-sans text-sm font-semibold whitespace-nowrap cursor-pointer transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-[var(--t-fast,160ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))] outline-none select-none focus-visible:border-ring active:scale-[0.97] active:duration-[var(--t-micro,80ms)] disabled:pointer-events-none disabled:opacity-55 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 isolate [&>*]:relative",
        {
                variants: {
                        variant: {
                                orange:
                                        /* the primary — Madarek .btn.primary: neutral premium
                                           elevation, −2px hover lift, and the ONE sheen sweep
                                           (bg-position band, 300% wide, 160% → −60%, 700ms
                                           decelerate). */
                                        'bg-orange text-orange-foreground hover:bg-orange/95 border-0 overflow-hidden shadow-[var(--shadow-card-premium)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-card-premium-h)] transition-[box-shadow,transform,background-color,color] duration-[var(--t-base,240ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))] before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[linear-gradient(105deg,transparent_45%,color-mix(in_oklab,var(--neutral-50)_30%,transparent)_51%,transparent_55%)] before:bg-[length:300%_100%] before:bg-no-repeat before:bg-[position:160%_0] before:transition-[background-position] before:duration-[var(--motion-duration-stat,700ms)] before:ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))] hover:before:bg-[position:-60%_0]',
                                flame:
                                        /* round94 (D/A8): هضبة saffron في منتصف التدرج (تقرير D: «يتدرّج من
                                           saffron مركز النص نحو ember عند الأطراف») — النص espresso الممركز
                                           كان يقف على منتصف المنحدر فقط (4.58:1 داكن حدّي) والآن على
                                           saffron الصرفة 8.97:1، مع إبقاء طرفي ember لهوية اللهب.
                                           r125 (10-a): الزاوية 135° → 145° — زاوية المعدن المداركية
                                           القياسية (unified-smart-parity --btn-primary-bg؛ نفس محاذاة
                                           text-gradient-orange/qr-corner في r8-a). المنحدر وسلسلة التباين
                                           (espresso على saffron) كما هي. r130 (W2-3): الظلّ الملوّن
                                           retired → رفع −2px + الظلّ الحيادي الممتاز.
                                           r133 (A10): hover:brightness-110 حُذف — المرجع (madarek) لا
                                           يستعمل مرشّح السطوع إطلاقًا؛ الرفع + الظلّ الحيادي هما لغة
                                           التحويم القانونية. */
                                        'bg-[linear-gradient(145deg,var(--c-ember),var(--c-saffron)_50%,var(--c-ember))] text-espresso border-0 shadow-[var(--shadow-card-premium)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-card-premium-h)]',
                                outline:
                                        'border-border/70 bg-transparent text-foreground hover:bg-foreground/5 hover:border-orange/40 hover:shadow-sm dark:hover:bg-foreground/10 dark:hover:border-orange/35',
                                ghost:
                                        'bg-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/10 border-transparent dark:hover:bg-foreground/15',
                                destructive:
                                        /* r131-F4 (A1 P1-8): solid danger fill (madarek .btn.danger —
                                           solid --danger ground + void ink, 5.5:1) with the same
                                           premium hover register as the other solid variants; the
                                           old /10 soft wash read as a disabled ghost next to the
                                           family's solid danger buttons. */
                                        'bg-destructive text-destructive-foreground border-0 shadow-[var(--shadow-card-premium)] hover:-translate-y-[2px] hover:shadow-[var(--shadow-card-premium-h)] hover:bg-destructive/95 focus-visible:border-destructive/40',
                        },
                        size: {
                                sm: 'h-8 gap-1.5 rounded-sm px-3 text-xs',
                                default: 'h-10 gap-2 px-5 text-sm',
                                /* lg label = --type-body-size 15px flat
                                   (components.css:468) — the 13px mobile
                                   split is retired (r130 W2-3). */
                                lg: 'h-12 gap-2.5 px-6 text-base',
                                icon: 'size-10',
                        },
                },
                defaultVariants: {
                        variant: 'orange',
                        size: 'default',
                },
        }
);

function Button({
        className,
        variant = 'orange',
        // "flame" (ember→saffron warm) is the signature CTA treatment — used in
        // the QR-corner moments (menu order FAB, share card).
        size = 'default',
        loading = false,
        'aria-label': ariaLabel,
        children,
        ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & {
        loading?: boolean;
        'aria-label'?: string;
}) {
        return (
                <ButtonPrimitive
                        data-slot="button"
                        className={cn(buttonVariants({ variant, size, className }))}
                        aria-label={ariaLabel}
                        aria-busy={loading}
                        disabled={loading || props.disabled}
                        {...props}
                >
                        {loading && (
                                <>
                                        <Loader2 className="animate-spin size-4" aria-hidden="true" />
                                        {/* r133 (A10 Must-1): busy buttons were SR-silent — the spinner is
                                           aria-hidden and the label children unmount while loading, so a
                                           screen reader heard nothing during the money-path submits. The
                                           global aria-busy flag now has spoken text (SO spelling). */}
                                        <span className="sr-only">جارٍ التحميل…</span>
                                </>
                        )}
                        {!loading && children}
                </ButtonPrimitive>
        );
}

export { Button, buttonVariants };
