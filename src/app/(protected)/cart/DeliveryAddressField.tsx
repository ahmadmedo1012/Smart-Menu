'use client';

interface DeliveryAddressFieldProps {
        value: string;
        onChange: (v: string) => void;
}

/** Delivery address textarea — verbatim extraction from the cart page (round89-G1). */
export function DeliveryAddressField({ value, onChange }: DeliveryAddressFieldProps) {
        return (
                <div className="mb-6 animate-slide-up delay-150">
                        <label className="text-sm font-medium mb-2 block">عنوان التوصيل</label>
                        <textarea
                                placeholder="أدخل عنوان التوصيل بالتفصيل"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                className="w-full rounded-lg border border-border/30 bg-card/50 p-3 text-sm outline-none focus-visible:border-orange resize-none"
                                rows={2}
                                maxLength={500}
                        />
                </div>
        );
}
