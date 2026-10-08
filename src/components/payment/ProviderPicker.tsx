'use client';

import { Smartphone, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaymentProvider } from '@/lib/payment-constants';

/**
 * round87-C7 — the payment-method tab group, extracted from PaymentDialog
 * (the 768-line dialog carried picker + poll + upload + 4 step UIs).
 * Markup identical to the previous inline version.
 */
export function ProviderPicker({
        provider,
        onSelect,
        requiresBank,
}: {
        provider: PaymentProvider;
        onSelect: (p: PaymentProvider) => void;
        requiresBank: boolean;
}) {
        return (
                <div>
                        <span id="payment-method-label" className="text-sm font-medium leading-none block">طريقة الدفع</span>
                        <div role="group" aria-labelledby="payment-method-label" className="grid grid-cols-3 gap-2 mt-1.5">
                                {[
                                        { id: 'libyana' as PaymentProvider, label: 'ليبيانا', icon: Smartphone, disabled: requiresBank },
                                        { id: 'madar' as PaymentProvider, label: 'مدار', icon: Smartphone, disabled: requiresBank },
                                        { id: 'bank' as PaymentProvider, label: 'تحويل بنكي', icon: Landmark, disabled: false },
                                ].map((opt) => {
                                        const Icon = opt.icon;
                                        return (
                                                <button
                                                        key={opt.id}
                                                        type="button"
                                                        onClick={() => onSelect(opt.id)}
                                                        disabled={opt.disabled}
                                                        className={cn(
                                                                'h-14 rounded-xl border-2 text-[13px] font-medium transition-[border-color,box-shadow,color,background-color] flex flex-col items-center justify-center gap-1',
                                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                opt.disabled && 'opacity-40 cursor-not-allowed',
                                                                provider === opt.id
                                                                        ? 'border-orange bg-orange-muted/40 dark:bg-orange-muted/20 shadow-sm'
                                                                        : 'border-border/30 hover:border-orange/30 text-muted-foreground'
                                                        )}
                                                >
                                                        <Icon className="size-4" />
                                                        {opt.label}
                                                </button>
                                        );
                                })}
                        </div>
                        {requiresBank && (
                                /* r95: تنبيه الدفع — accent-foreground الأسطع (AA 5.42:1) */
                                <p className="text-xs text-accent-foreground mt-2">
                                        المبالغ فوق 99 د.ل تتطلب تحويل بنكي — اختر &quot;تحويل بنكي&quot; لإتمام الدفع
                                </p>
                        )}
                </div>
        );
}
