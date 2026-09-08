/**
 * round85-B1 — lightweight hero decorations (pure SVG, ~2KB).
 *
 * Replaces the two decorative corner Lotties (food-choice + cooking, ~277KB of
 * .lottie files + the ~87KB dotlottie runtime) that loaded on the cold
 * critical path of every first QR visit. These inline SVGs preserve the same
 * corner placement, opacity, and gentle motion using existing CSS keyframes —
 * with zero network cost and zero JS.
 *
 * Decorative only: aria-hidden, pointer-events-none, select-none, and fully
 * static for reduced-motion users.
 *
 * r95: الحبر switched إلى accent-foreground (#df5a00 الأسطع) — رمزياً زخرفي
 * فلا قيد AA عليه، لكنه يظهر بلون اللهب على الخلفية #010000 بدل الاختفاء.
 */
export function HeroDecor() {
        return (
                <>
                        {/* Top corner — plate & utensils motif */}
                        <div
                                aria-hidden="true"
                                className="absolute top-8 end-8 size-24 md:size-32 opacity-30 dark:opacity-20 pointer-events-none select-none motion-reduce:animate-none"
                        >
                                <svg
                                        viewBox="0 0 64 64"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="size-full text-accent-foreground animate-orb-float"
                                >
                                        {/* plate */}
                                        <circle cx="32" cy="36" r="16" />
                                        <circle cx="32" cy="36" r="9" />
                                        {/* fork */}
                                        <path d="M8 20v10a4 4 0 0 0 8 0V20" />
                                        <path d="M12 20v14" />
                                        {/* spoon */}
                                        <ellipse cx="54" cy="24" rx="4" ry="6" />
                                        <path d="M54 30v8" />
                                </svg>
                        </div>

                        {/* Bottom corner — serving cloche with steam */}
                        <div
                                aria-hidden="true"
                                className="absolute bottom-4 start-4 size-20 md:size-28 opacity-25 dark:opacity-15 pointer-events-none select-none motion-reduce:animate-none"
                        >
                                <svg
                                        viewBox="0 0 64 64"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="size-full text-accent-foreground animate-orb-float-delayed"
                                >
                                        {/* steam wisps */}
                                        <path d="M26 14c-1.5-2 1.5-3.5 0-6" />
                                        <path d="M34 12c-1.5-2 1.5-3.5 0-6" />
                                        <path d="M42 14c-1.5-2 1.5-3.5 0-6" />
                                        {/* cloche dome + handle */}
                                        <path d="M12 44a20 20 0 0 1 40 0" />
                                        <circle cx="32" cy="21" r="2.5" />
                                        {/* tray base */}
                                        <path d="M8 48h48" />
                                        <path d="M12 52h40" />
                                </svg>
                        </div>
                </>
        );
}
