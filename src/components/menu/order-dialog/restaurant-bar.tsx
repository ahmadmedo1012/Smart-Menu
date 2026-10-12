'use client';

/**
 * 17-DEBT-SM (r147): شريط معلومات المطعم داخل نافذة الطلب — الشعار/الاسم
 * + شارة نسبة التوفير. فُصل عن OrderDialog.tsx كما هو حرفيًا؛ اشتقاق
 * hasDiscount انتقل معه (كان حكرًا على هذه الكتلة وحدَها في الأب).
 */
import { Store } from 'lucide-react';
import { toArabicNumber } from '@/lib/format';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import type { MenuItemProp } from '../MenuItemCard';

export function RestaurantBar({
        item,
        restaurantName,
        restaurantLogo,
}: {
        item: MenuItemProp;
        restaurantName?: string;
        restaurantLogo?: string;
}) {
        const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;
        return (
                <div className="glass-card rounded-xl p-3 flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shrink-0 shadow-md">
                                {restaurantLogo ? (
                                        /* round88-A2: box is size-12 (48px) */
                                        <OptimizedImage
                                                src={restaurantLogo}
                                                alt=""
                                                className="size-full"
                                                aspectRatio="square"
                                                skeleton={false}
                                                sizes="48px"
                                        />
                                ) : (
                                        <Store className="size-6 text-orange-foreground" />
                                )}
                        </div>
                        <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm">{restaurantName || 'المطعم'}</p>
                                <p className="text-xs text-muted-foreground">طلب جديد</p>
                        </div>
                        {hasDiscount && (
                                /* round80: unified savings semantic — success family (matches
                                   MenuItemCard's discount badge), destructive stays for errors.
                                   r138 (P1-1): الحبر النصي في الفاتح — success-ink 8.3:1
                                   على success/10 (كان 2.63:1)؛ الداكن كما هو. */
                                <span className="text-xs bg-success/10 text-success-ink px-2 py-0.5 rounded-full">
                                        -{toArabicNumber(Math.round((1 - item.discountedPrice! / item.price) * 100))}%
                                </span>
                        )}
                </div>
        );
}
