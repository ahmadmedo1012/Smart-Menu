'use client';

interface DeliveryAddressFieldProps {
        value: string;
        onChange: (v: string) => void;
}

/** Delivery address textarea — verbatim extraction from the cart page (round89-G1). */
export function DeliveryAddressField({ value, onChange }: DeliveryAddressFieldProps) {
        return (
                <div className="mb-6 animate-slide-up stagger-2">
                        {/* r119-S5-P1-2: label was never associated with the textarea
                                (no htmlFor/id) — screen readers announced an unnamed field. */}
                        <label htmlFor="delivery-address" className="text-sm font-medium mb-2 block">
                                عنوان التوصيل
                        </label>
                        {/* r118-A5-F2: the client composes notes + «العنوان:» + address into
                                ONE field capped at 500 server-side (120 + 9 + 500 used to compose
                                629 → guaranteed 422 with no field detail). */}
                        {/* r131 (A2 P1-3): أرضية 16px (منع تكبير iOS) + حلقة التركيز القانونية
                                3px/22% — كان الحقل بلا هالة تركيز إطلاقاً. */}
                        <textarea
                                id="delivery-address"
                                name="delivery-address"
                                placeholder="أدخل عنوان التوصيل بالتفصيل"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className="w-full min-h-11 rounded-md border border-input bg-card/50 p-3 text-[16px] placeholder:text-placeholder-text outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)] resize-none"
                                rows={2}
                                maxLength={360}
                                aria-required="true"
                        />
                </div>
        );
}
