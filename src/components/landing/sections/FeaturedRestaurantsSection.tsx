"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Star, Phone, ArrowLeft } from "lucide-react";
import { springGentle } from "@/lib/motion";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { FeaturedRestaurant } from "@/lib/landing";

type Props = {
    restaurants: FeaturedRestaurant[];
};

function RestaurantCard({
    restaurant,
    index,
}: {
    restaurant: FeaturedRestaurant;
    index: number;
}) {
    const initial = restaurant.logo
        ? restaurant.logo.charAt(0).toUpperCase()
        : restaurant.name.charAt(0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ ...springGentle, delay: index * 0.04 }}
            className="shrink-0 w-[280px] sm:w-[320px] snap-start"
        >
            <Link
                href={`/menu/${restaurant.slug}`}
                className="group block relative bg-card rounded-2xl ring-1 ring-border/40 overflow-hidden transition-shadow duration-300 hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.4)]"
            >
                {/* Logo / placeholder */}
                <div className="relative h-36 sm:h-40 bg-gradient-to-br from-orange-muted/40 to-orange/5 flex items-center justify-center overflow-hidden">
                    {restaurant.logo ? (
                        <Image
                            src={restaurant.logo}
                            alt={restaurant.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="320px"
                        />
                    ) : (
                        <span className="text-4xl font-semibold text-orange/30 select-none">
                            {initial}
                        </span>
                    )}
                    {/* Order count badge */}
                    {restaurant.orderCount > 0 && (
                        <div className="absolute top-2.5 start-2.5 flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-foreground/60">
                            <Star className="size-2.5 text-orange" />
                            {restaurant.orderCount}
                        </div>
                    )}
                    {/* View menu arrow */}
                    <div className="absolute bottom-2.5 end-2.5 flex items-center gap-1 rounded-full bg-orange/90 text-white px-2.5 py-1 text-[10px] font-medium opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        عرض المنيو
                        <ArrowLeft className="size-3" />
                    </div>
                </div>

                {/* Info */}
                <div className="p-3.5">
                    <h3 className="text-sm font-semibold leading-tight truncate">
                        {restaurant.name}
                    </h3>
                    {restaurant.description && (
                        <p className="mt-1 text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-2">
                            {restaurant.description}
                        </p>
                    )}

                    {/* City + phone */}
                    <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground/50">
                        {(restaurant.city || restaurant.phone || restaurant.whatsapp) && (
                            <>
                                {restaurant.city && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="size-2.5" />
                                        {restaurant.city}
                                    </span>
                                )}
                                {(restaurant.phone || restaurant.whatsapp) && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="size-2.5" />
                                        {restaurant.phone || restaurant.whatsapp}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

export default function FeaturedRestaurantsSection({ restaurants }: Props) {
    if (restaurants.length === 0) return null;

    return (
        <SectionContainer className="bg-gradient-to-b from-background via-orange/[0.015] to-background">
            <SectionHeader
                icon={<Star className="size-3" />}
                eyebrow="منيو حقيقي"
                title="اطلع على منيو هذه المطاعم"
                subtitle="تصفح منيو مطاعم حقيقية تستخدم المنصة وشاهد تجربة الزبائن"
            />

            {/* Scroll-snap rail */}
            <div className="overflow-x-auto pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6 scroll-smooth" dir="ltr">
                <div className="flex gap-4 sm:gap-5 w-max" dir="rtl">
                    {restaurants.map((r, i) => (
                        <RestaurantCard key={r.id} restaurant={r} index={i} />
                    ))}
                </div>
            </div>
        </SectionContainer>
    );
}
