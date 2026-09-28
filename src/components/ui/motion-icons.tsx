"use client";
// r121-O-2: one of the two duplicated 'use client' directives (lines 1–2) was
// an edit leftover — a module needs exactly one.

import { Plus, Check, Minus, Search, ArrowLeft, ArrowRight, Menu as MenuIcon, ChevronLeft, ChevronRight, ChevronDown, LogIn } from 'lucide-react';
import { m, useAnimate } from 'motion/react';
import { forwardRef, useImperativeHandle, type SVGProps } from 'react';

/**
 * Motion-enhanced lucide icons (Plan B — for icons not in the itshover
 * catalog). Uses useAnimate (the same proven pattern as itshover icons) —
 * animates on hoverStart/hoverEnd via imperative animate(), which is far
 * more reliable than whileHover on nested SVGs. Drop-in replacement for
 * plain lucide: size/color/className API unchanged.
 */
type MotionIconProps = SVGProps<SVGSVGElement>;

function makeMotionIcon(Icon: typeof Plus, label: string) {
        const Cmp = forwardRef<SVGSVGElement, MotionIconProps>(
                ({ className, width, height, ...rest }, ref) => {
                        const [scope, animate] = useAnimate();
                        useImperativeHandle(ref, () => scope.current as SVGSVGElement);

                        const start = () => {
                                animate(
                                        scope.current,
                                        { scale: 1.15, rotate: label === 'Plus' ? 90 : label === 'Check' ? 15 : label === 'Minus' ? -90 : 0 },
                                        { type: 'spring', stiffness: 400, damping: 15 }
                                );
                        };
                        const stop = () => {
                                animate(scope.current, { scale: 1, rotate: 0 }, { type: 'spring', stiffness: 300, damping: 20 });
                        };

                        return (
                                <m.svg
                                        ref={scope}
                                        className={className}
                                        width={width ?? '100%'}
                                        height={height ?? '100%'}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ display: 'block' }}
                                        onHoverStart={start}
                                        onHoverEnd={stop}
                                >
                                        <Icon {...(rest as object)} className="w-full h-full" />
                                </m.svg>
                        );
                }
        );
        Cmp.displayName = `Motion${label}`;
        return Cmp;
}

export const MotionPlus = makeMotionIcon(Plus, 'Plus');
export const MotionCheck = makeMotionIcon(Check, 'Check');
export const MotionMinus = makeMotionIcon(Minus, 'Minus');
export const MotionSearch = makeMotionIcon(Search, 'Search');
export const MotionArrowLeft = makeMotionIcon(ArrowLeft, 'ArrowLeft');
export const MotionArrowRight = makeMotionIcon(ArrowRight, 'ArrowRight');
export const MotionMenu = makeMotionIcon(MenuIcon, 'Menu');
export const MotionChevronLeft = makeMotionIcon(ChevronLeft, 'ChevronLeft');
export const MotionChevronRight = makeMotionIcon(ChevronRight, 'ChevronRight');
export const MotionChevronDown = makeMotionIcon(ChevronDown, 'ChevronDown');
// MotionLogIn stays LIVE (admin dashboard CTA — admin/page.tsx)
export const MotionLogIn = makeMotionIcon(LogIn, 'LogIn');
// r121-O-2/F-2: 18 dead Motion* wrappers (Phone, MapPin, Store, Crown, Award,
// Gift, Medal, Settings, TrendingUp, Activity, BarChart3, Smartphone,
// AlertTriangle, Building2, Landmark, CreditCard, Lightbulb, Stethoscope) were
// deleted — grep-verified zero references across src/tests/scripts/mobile by
// two auditors and re-verified at deletion time.