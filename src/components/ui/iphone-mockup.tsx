'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/* ── IPhoneMockup ──────────────────────────────────────────────
 * Configurable iPhone frame with wallpaper + content slot.
 * Adapted from Scottclayton3d/iphone-mockup for project tokens + RTL.
 * ponytail: 2 models + 3 colors — full spec when design system demands it
 */

type IPhoneModel = '15-pro' | 'plain';
type WallpaperFit = 'cover' | 'contain';

interface IPhoneMockupProps {
        model?: IPhoneModel;
        color?: 'black' | 'titanium' | 'natural-titanium';
        scale?: number;
        shadow?: boolean;
        screenBg?: string;
        wallpaper?: string;
        wallpaperFit?: WallpaperFit;
        className?: string;
        children?: ReactNode;
}

const SPECS: Record<
        IPhoneModel,
        {
                w: number;
                h: number;
                radius: number;
                bezel: number;
                topSafe: number;
                bottomSafe: number;
        }
> = {
        '15-pro': { w: 393, h: 852, radius: 56, bezel: 12, topSafe: 59, bottomSafe: 34 },
        plain: { w: 390, h: 844, radius: 56, bezel: 12, topSafe: 16, bottomSafe: 16 },
};

const COLORS: Record<string, string> = {
        black: 'var(--c-device-black)',
        titanium: 'var(--c-device-ti)',
        'natural-titanium': 'var(--c-device-ti-natural)',
};

export function IPhoneMockup({
        model = '15-pro',
        color = 'natural-titanium',
        scale = 1,
        shadow = true,
        screenBg = 'var(--c-device-screen)',
        wallpaper,
        wallpaperFit = 'cover',
        className,
        children,
}: IPhoneMockupProps) {
        const spec = SPECS[model];
        const sw = spec.w;
        const outerW = sw + spec.bezel * 2;
        const outerH = spec.h + spec.bezel * 2;
        const colorHex = COLORS[color] ?? color;

        const frameGrad = `linear-gradient(135deg, color-mix(in srgb, ${colorHex} 92%, white) 0%, ${colorHex} 40%, color-mix(in srgb, ${colorHex} 86%, black) 100%)`;
        const dropShadow = shadow ? '0 12px 30px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.22)' : 'none';
        const innerShadowCss =
                'inset 0 0 0 1px rgba(255,255,255,0.03), inset 0 10px 20px rgba(0,0,0,0.35), inset 0 -8px 16px rgba(0,0,0,0.28)';

        return (
                <div
                        role="img"
                        /* r93-W2a (U8): كان aria-label إنجليزيًا "iPhone mockup (model)"
                           يُقرأ على قارئ الشاشة داخل صفحة بطل عربية بالكامل. */
                        aria-label="هاتف آيفون تجريبي"
                        className={cn('flex justify-center', className)}
                        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
                >
                        <div
                                className="w-full"
                                style={{ maxWidth: outerW, aspectRatio: `${outerW} / ${outerH}` }}
                        >
                                <div
                                        className="relative h-full w-full"
                                        style={{
                                                borderRadius: "min(68px, 14%)",
                                                background: frameGrad,
                                                padding: spec.bezel,
                                                boxShadow: dropShadow,
                                                overflow: 'hidden',
                                        }}
                                >
                                <div
                                        style={{
                                                width: '100%',
                                                height: '100%',
                                                borderRadius: "min(56px, 11.5%)",
                                                position: 'relative',
                                                overflow: 'hidden',
                                                background: screenBg,
                                                boxShadow: innerShadowCss,
                                        }}
                                >
                                        {wallpaper && (
                                                <div
                                                        aria-hidden
                                                        style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                backgroundImage: `url(${wallpaper})`,
                                                                backgroundSize: wallpaperFit,
                                                                backgroundPosition: 'center',
                                                                backgroundRepeat: 'no-repeat',
                                                                zIndex: 0,
                                                        }}
                                                />
                                        )}

                                        {/* Dynamic Island */}
                                        <div
                                                aria-hidden
                                                style={{
                                                        position: 'absolute',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        top: 12,
                                                        width: 126,
                                                        height: 37,
                                                        borderRadius: 20,
                                                        background: 'var(--c-device-screen)',
                                                        zIndex: 2,
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.7)',
                                                }}
                                        />

                                        {/* Screen content */}
                                        <div
                                                style={{
                                                        position: 'absolute',
                                                        top: spec.topSafe,
                                                        right: 0,
                                                        bottom: spec.bottomSafe,
                                                        left: 0,
                                                        overflow: 'hidden',
                                                        zIndex: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                }}
                                        >
                                                {children}
                                        </div>

                                        {/* Home indicator */}
                                        <div
                                                aria-hidden
                                                style={{
                                                        position: 'absolute',
                                                        bottom: 8,
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        width: Math.min(Math.round(sw * 0.34), 140),
                                                        height: 5,
                                                        borderRadius: 3,
                                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
                                                        opacity: 0.9,
                                                        zIndex: 3,
                                                        pointerEvents: 'none',
                                                }}
                                        />
                                </div>
                                </div>
                        </div>
                </div>
        );
}
