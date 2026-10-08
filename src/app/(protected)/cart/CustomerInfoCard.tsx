'use client';

import AnimatedSparkles from '@/components/ui/sparkles-icon';

interface CustomerInfoCardProps {
        notes: string;
        phone: string;
        onNotesChange: (v: string) => void;
        onPhoneChange: (v: string) => void;
}

/** Order notes + loyalty phone card — verbatim extraction from the cart page (round89-G1). */
export function CustomerInfoCard({ notes, phone, onNotesChange, onPhoneChange }: CustomerInfoCardProps) {
        return (
                <div className="rounded-md bg-card/60 border border-border/30 p-5 mb-6 animate-slide-up stagger-3">
                        <h2 className="font-bold mb-3 flex items-center gap-2">
                                <AnimatedSparkles className="size-4 text-primary" />
                                ملاحظات الطلب
                        </h2>
                        <div className="grid grid-cols-1 gap-3">
                                <div>
                                        <label htmlFor="cart-notes" className="block text-xs text-muted-foreground mb-1.5">
                                                ملاحظات (اختياري)
                                        </label>
                                        <input
                                                id="cart-notes"
                                                type="text"
                                                dir="auto"
                                                placeholder="مثال: بدون بصل، الطلب مستعجل..."
                                                maxLength={120}
                                                value={notes}
                                                onChange={(e) => onNotesChange(e.target.value)}
                                                className="w-full h-11 rounded-md border border-input bg-transparent px-4 text-[16px] placeholder:text-placeholder-text outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)]"
                                        />
                                </div>
                                <div>
                                        <label htmlFor="cart-phone" className="block text-xs text-muted-foreground mb-1.5">
                                                رقم الهاتف لكسب نقاط الولاء (اختياري)
                                        </label>
                                        <input
                                                id="cart-phone"
                                                type="tel"
                                                inputMode="tel"
                                                dir="ltr"
                                                placeholder="09XXXXXXXX"
                                                maxLength={15}
                                                value={phone}
                                                onChange={(e) => onPhoneChange(e.target.value)}
                                                className="w-full h-11 rounded-md border border-input bg-transparent px-4 text-[16px] placeholder:text-placeholder-text outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)] text-left"
                                        />
                                        <p className="text-2xs text-muted-foreground mt-1">
                                                ادخل رقمك ليكسب برنامج الولاء نقاطاً مقابل هذا الطلب
                                        </p>
                                </div>
                        </div>
                </div>
        );
}
