'use client';
import { getErrorMessage } from '@/lib/get-error-message';

import { useState, useEffect, useRef, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { m } from 'motion/react';
import {Smartphone, Landmark, CheckCircle2, XCircle} from 'lucide-react';
import AnimatedCopy from '@/components/ui/copy-icon';
import {
        WALLET_CAP_LYD,
        MADAR_PHONE_FALLBACK,
        LIBYANA_PHONE_FALLBACK,
        libyanaUssdCode,
        madarUssdCode,
        type PaymentProvider,
} from '@/lib/payment-constants';
import { useConfig } from '@/hooks/useConfig';
import { usePaymentStatusPoll } from '@/hooks/usePaymentStatusPoll';
import { ProviderPicker } from '@/components/payment/ProviderPicker';
import { ReceiptUpload } from '@/components/payment/ReceiptUpload';

type Provider = PaymentProvider;

/**
 * r97-X2 [5]: SystemConfig values arrive as JSON (unknown) — a cast like
 * `config?.x as string` renders numbers/booleans as text if the stored type
 * ever drifts. This tiny guard only accepts non-empty strings and falls
 * back otherwise, so the money-path dialog can never print a wrong-typed
 * value.
 */
function configStr(v: unknown, fb: string): string {
        return typeof v === 'string' && v.trim() ? v : fb;
}

interface PaymentDialogProps {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        planId: number;
        planName: string;
        planNameAr: string;
        price: number;
        onSuccess: () => void;
        tempRestaurants?: { name: string; slug: string }[];
        tempUsername?: string;
        upgradeRestaurantId?: number;
}

export function PaymentDialog({
        open,
        onOpenChange,
        planId,
        planNameAr,
        price,
        onSuccess,
        tempRestaurants,
        tempUsername,
        upgradeRestaurantId,
}: PaymentDialogProps) {
        const [provider, setProvider] = useState<Provider>('libyana');
        // Mobile wallets (libyana/madar) cap at WALLET_CAP_LYD — plans above that require bank transfer
        const requiresBank = Number(price) > WALLET_CAP_LYD;
        // Auto-switch to bank when the plan exceeds the wallet cap
        useEffect(() => {
                if (requiresBank && (provider === 'libyana' || provider === 'madar')) {
                        setProvider('bank');
                }
        }, [requiresBank, provider]);
        const { config } = useConfig();
        const MADAR_PHONE = configStr(config?.balance_transfer_phone_1, MADAR_PHONE_FALLBACK);
        const LIBYANA_PHONE = configStr(config?.balance_transfer_phone_2, LIBYANA_PHONE_FALLBACK);

        const [phone, setPhone] = useState('');
        // round79 Stage C: axe caught the bank form fields having unassociated
        // <Label> siblings (no htmlFor/id) — the amount input (no placeholder)
        // had NO accessible name at all (critical). Associate visible labels:
        const bankAmountId = useId();
        const senderNameId = useId();
        const senderNumberId = useId();
        const [bankAmount, setBankAmount] = useState(price);
        const [senderAccountName, setSenderAccountName] = useState('');
        const [senderAccountNumber, setSenderAccountNumber] = useState('');
        const [receiptImageUrl, setReceiptImageUrl] = useState('');
        const [step, setStep] = useState<'form' | 'waiting' | 'success' | 'approved' | 'rejected'>(
                'form'
        );
        const [resolutionMsg, setResolutionMsg] = useState('');
        const [submitting, setSubmitting] = useState(false);
        const [paymentId, setPaymentId] = useState<number | null>(null);

        const providerPhone = provider === 'libyana' ? LIBYANA_PHONE : MADAR_PHONE;
        const providerName = provider === 'libyana' ? 'ليبيانا' : 'مدار';

        // Bank account details from SystemConfig (same mechanism as the phones)
        const BANK_NAME = configStr(config?.bank_transfer_bank_name, '');
        const BANK_ACCOUNT = configStr(config?.bank_transfer_account_number, '');
        const BANK_IBAN = configStr(config?.bank_transfer_iban, '');

        const quickTransferCode =
                provider === 'libyana'
                        ? libyanaUssdCode(LIBYANA_PHONE, Number(price))
                        : madarUssdCode(MADAR_PHONE, Number(price));

        const encodedUSSD = quickTransferCode.replace(/#/g, '%23');

        const copyToClipboard = async (text: string): Promise<boolean> => {
                try {
                        await navigator.clipboard.writeText(text);
                        premiumToast('copy', 'تم النسخ');
                        return true;
                } catch {
                        premiumToast('error', 'فشل النسخ');
                        return false;
                }
        };

        const sentRef = useRef(false);
        const handleSent = async () => {
                if (sentRef.current) return; // C3 fix: block double-click double-payment
                const isBank = provider === 'bank';
                // Validate BEFORE latching the guard — a failed validation must leave
                // the button usable (previously the latch ran first and any validation
                // failure bricked submission until full page reload).
                if (!isBank && !phone.trim()) {
                        premiumToast('error', 'يرجى إدخال رقم هاتفك');
                        return;
                }
                if (isBank) {
                        if (!senderAccountName.trim()) {
                                premiumToast('error', 'يرجى إدخال اسم صاحب الحساب');
                                return;
                        }
                        if (!senderAccountNumber.trim()) {
                                premiumToast('error', 'يرجى إدخال رقم الحساب');
                                return;
                        }
                }
                sentRef.current = true;
                setSubmitting(true);
                try {
                        const endpoint = upgradeRestaurantId ? '/api/subscriptions/upgrade' : '/api/subscriptions';
                        const res = await csrfFetch(endpoint, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                        phone: isBank ? undefined : phone.trim(),
                                        amount: isBank ? bankAmount : price,
                                        provider,
                                        planId,
                                        ...(isBank
                                                ? {
                                                                senderAccountName: senderAccountName.trim(),
                                                                senderAccountNumber: senderAccountNumber.trim(),
                                                                ...(receiptImageUrl ? { receiptImageUrl } : {}),
                                                        }
                                                : {}),
                                        ...(tempRestaurants && tempRestaurants.length > 0
                                                ? { tempRestaurants }
                                                : {}),
                                        ...(tempUsername ? { tempUsername } : {}),
                                        ...(upgradeRestaurantId ? { upgradeRestaurantId } : {}),
                                }),
                        });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.error ?? 'فشل إرسال طلب الدفع');
                        setPaymentId(json.data.id);
                        setStep('waiting');
                } catch (e) {
                        premiumToast('error', getErrorMessage(e));
                        sentRef.current = false; // allow retry on failure
                } finally {
                        setSubmitting(false);
                }
        };

        // round87-C7: the 60-line approval-poll machine (interval + visibility
        // pause + failure cap + cleanup refs) now lives in usePaymentStatusPoll,
        // built on the shared usePollWhenVisible loop. Deps fix: the old effect
        // listed `finishFlow` in deps without ever calling it.
        usePaymentStatusPoll({
                active: step === 'waiting',
                paymentId,
                onApproved: () => {
                        setResolutionMsg('تم الموافقة على اشتراكك بنجاح! سيتم توجيهك إلى لوحة التحكم.');
                        setStep('approved');
                },
                onRejected: (message) => {
                        setResolutionMsg(
                                message ||
                                        'عذراً، تم رفض طلب تفعيل الاشتراك. يمكنك تعديل البيانات والمحاولة مرة أخرى.'
                        );
                        setStep('rejected');
                },
        });

        // r97-X2 [4]: reset-on-open (mirrors the OrderDialog.tsx ~74-86 pattern).
        // The old close-side handler latched `setBankAmount(price)` at close time,
        // so closing on plan A and reopening on plan B kept the bank form on plan
        // A's amount (money-path bug — the submitted amount could be stale) and
        // let `step`/`resolutionMsg` leak across sessions. Resetting here with the
        // CURRENT props guarantees a clean form on every open or plan switch.
        useEffect(() => {
                if (open) {
                        sentRef.current = false; // fresh submit allowed for the new flow
                        setStep('form');
                        setBankAmount(price);
                        setPhone('');
                        setSenderAccountName('');
                        setSenderAccountNumber('');
                        setReceiptImageUrl('');
                        setPaymentId(null);
                        setResolutionMsg('');
                        setSubmitting(false);
                }
        }, [open, planId, price]);

        // r97-X2: plain function (no manual useCallback) — react-compiler
        // auto-memoizes; the manual deps [onOpenChange, price] couldn't be
        // preserved once the reset effect above joined the component.
        const handleOpenChange = (open: boolean) => {
                if (!open) {
                        sentRef.current = false; // fresh submit allowed on reopen
                        setStep('form');
                        setPhone('');
                        setBankAmount(price);
                        setSenderAccountName('');
                        setSenderAccountNumber('');
                        setReceiptImageUrl('');
                        setPaymentId(null);
                }
                onOpenChange(open);
        };

        return (
                <Dialog open={open} onOpenChange={handleOpenChange}>
                        <DialogContent className="max-w-sm sm:max-w-md rounded-2xl p-0 gap-0 max-h-[90dvh] overflow-y-auto border-border/50 shadow-2xl">
                                {/* Header */}
                                <div className="bg-gradient-to-br from-orange to-orange/80 text-orange-foreground p-6">
                                        <div className="flex items-center gap-2 mb-2">
                                                <Smartphone className="size-5" />
                                                <DialogTitle className="text-orange-foreground text-lg font-bold">دفع الاشتراك</DialogTitle>
                                        </div>
                                        <DialogDescription className="text-orange-foreground/70 text-sm">
                                                ادفع عبر المحفظة الإلكترونية
                                        </DialogDescription>
                                </div>

                                <div className="p-5 space-y-5">
                                        {/* Plan summary */}
                                        <div className="rounded-xl bg-orange-muted/50 dark:bg-orange-muted/20 border border-orange/15 p-4">
                                                <div className="flex justify-between items-center">
                                                        <span className="font-bold">{planNameAr}</span>
                                                        <span className="text-lg font-bold text-accent-foreground">{price} د.ل</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">اشتراك شهري</p>
                                        </div>

                                        {step === 'form' && (
                                                <>
                                                        {/* Payment method tabs */}
                                                        <ProviderPicker
                                                                provider={provider}
                                                                onSelect={setProvider}
                                                                requiresBank={requiresBank}
                                                        />

                                                        {provider !== 'bank' && (
                                                                <>
                                                                        {/* Provider phone */}
                                                                        <div className="rounded-xl bg-muted/30 border border-border/20 p-3">
                                                                                <p className="text-xs text-muted-foreground mb-1">
                                                                                        أرسل المبلغ إلى {providerName}
                                                                                </p>
                                                                                <div className="flex items-center justify-between">
                                                                                        <span className="font-bold text-lg tracking-wide font-mono" dir="ltr">
                                                                                                {providerPhone}
                                                                                        </span>
                                                                                        <button
                                                                                                type="button"
                                                                                                onClick={() => copyToClipboard(providerPhone)}
                                                                                                className="size-10 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                                                                title="نسخ الرقم"
                                                                                        >
                                                                                                <AnimatedCopy className="size-3.5" />
                                                                                        </button>
                                                                                </div>
                                                                        </div>

                                                                        {/* Quick transfer code */}
                                                                        <div className="rounded-xl bg-success/10 border border-success/25 p-3">
                                                                                <p className="text-xs font-medium text-success mb-1.5">
                                                                                        رمز التحويل السريع
                                                                                </p>
                                                                                <div className="flex items-center justify-between gap-2">
                                                                                        <span className="font-mono text-sm font-bold text-accent-foreground truncate" dir="ltr">
                                                                                                {quickTransferCode}
                                                                                        </span>
                                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                                                {/* One-tap: copy the code, then open the dialer (only on copy success) */}
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={async () => {
                                                                                                                const ok = await copyToClipboard(quickTransferCode);
                                                                                                                if (!ok) return;
                                                                                                                setTimeout(() => {
                                                                                                                        window.location.href = `tel:${encodedUSSD}`;
                                                                                                                }, 150);
                                                                                                        }}
                                                                                                        className="h-9 px-3 rounded-lg bg-success hover:bg-success/90 text-success-foreground text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                                                                        title="نسخ الرمز وفتح الاتصال"
                                                                                                >
                                                                                                        <AnimatedCopy className="size-3.5" />
                                                                                                        نسخ واتصال
                                                                                                </button>
                                                                                        </div>
                                                                                </div>
                                                                        </div>

                                                                        {/* User phone */}
                                                                        <div>
                                                                                <Label htmlFor="payment-phone">رقم هاتفك</Label>
                                                                                <Input
                                                                                        id="payment-phone"
                                                                                        value={phone}
                                                                                        onChange={(e) => setPhone(e.target.value)}
                                                                                        placeholder="09XXXXXXXXX"
                                                                                        inputMode="numeric"
                                                                                        maxLength={10}
                                                                                        className="h-11 rounded-xl mt-1.5 text-left font-mono"
                                                                                        dir="ltr"
                                                                                />
                                                                                <p className="text-2xs text-muted-foreground mt-1">
                                                                                        10 أرقام تبدأ بـ 09 — حتى نتمكن من التأكد من استلام التحويل
                                                                                </p>
                                                                        </div>
                                                                </>
                                                        )}

                                                        {/* Bank transfer section — replaces the mobile template entirely */}
                                                        {provider === 'bank' && (
                                                                <>
                                                                        {/* Bank account info card */}
                                                                        <div className="rounded-xl bg-muted/30 border border-border/20 p-3 space-y-2.5">
                                                                                <p className="text-xs font-medium flex items-center gap-1.5">
                                                                                        <Landmark className="size-3.5 text-orange" />
                                                                                        حوّل على الحساب البنكي التالي
                                                                                </p>
                                                                                {[
                                                                                        { label: 'المصرف', value: BANK_NAME, numeric: false },
                                                                                        { label: 'رقم الحساب', value: BANK_ACCOUNT, numeric: true },
                                                                                        { label: 'IBAN', value: BANK_IBAN, numeric: true },
                                                                                ].map((row) => (
                                                                                        <div key={row.label} className="flex items-center justify-between gap-2">
                                                                                                <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                                                                                                {/* r121-J-4: only the NUMERIC rows (account no./IBAN) keep the
                                                                                                    dir="ltr" + font-mono isolation — the bank NAME is an Arabic
                                                                                                    config value (bank_transfer_bank_name) that was forced through
                                                                                                    the LTR template: left-aligned, reordered, mono-set inside an
                                                                                                    RTL card. Name row: dir="auto" + start alignment. */}
                                                                                                <span
                                                                                                        className={`text-sm font-bold truncate ${row.numeric ? 'font-mono text-left' : 'text-start'}`}
                                                                                                        dir={row.numeric ? 'ltr' : 'auto'}
                                                                                                >
                                                                                                        {row.value}
                                                                                                </span>
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={() => copyToClipboard(row.value)}
                                                                                                        className="size-10 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                                                                        title={`نسخ ${row.label}`}
                                                                                                >
                                                                                                        <AnimatedCopy className="size-4" />
                                                                                                </button>
                                                                                        </div>
                                                                                ))}
                                                                        </div>

                                                                        {/* Bank amount — no 99 cap (server enforces plan price) */}
                                                                        <div>
                                                                                <Label htmlFor={bankAmountId}>المبلغ (د.ل)</Label>
                                                                                <Input
                                                                                        id={bankAmountId}
                                                                                        type="number"
                                                                                        value={bankAmount}
                                                                                        onChange={(e) => {
                                                                                                const v = Number(e.target.value);
                                                                                                if (isNaN(v) || v < 0) return;
                                                                                                setBankAmount(v);
                                                                                        }}
                                                                                        className="h-11 rounded-xl mt-1.5"
                                                                                        min={1}
                                                                                />
                                                                        </div>

                                                                        {/* Sender account name */}
                                                                        <div>
                                                                                <Label htmlFor={senderNameId}>اسم صاحب الحساب المُرسِل *</Label>
                                                                                <Input
                                                                                        id={senderNameId}
                                                                                        value={senderAccountName}
                                                                                        onChange={(e) => setSenderAccountName(e.target.value)}
                                                                                        placeholder="الاسم كما يظهر في الحساب"
                                                                                        className="h-11 rounded-xl mt-1.5"
                                                                                />
                                                                        </div>

                                                                        {/* Sender account number */}
                                                                        <div>
                                                                                <Label htmlFor={senderNumberId}>رقم حساب المُرسِل *</Label>
                                                                                <Input
                                                                                        id={senderNumberId}
                                                                                        value={senderAccountNumber}
                                                                                        onChange={(e) => setSenderAccountNumber(e.target.value)}
                                                                                        placeholder="رقم الحساب الذي حُوّل منه"
                                                                                        className="h-11 rounded-xl mt-1.5 text-left font-mono"
                                                                                        dir="ltr"
                                                                                />
                                                                        </div>

                                                                        <ReceiptUpload
                                                                                receiptImageUrl={receiptImageUrl}
                                                                                onReceiptChange={setReceiptImageUrl}
                                                                        />
                                                                </>
                                                        )}

                                                        {provider !== 'bank' && (
                                                                <div className="rounded-xl bg-muted/30 border border-border/20 p-3 flex items-center justify-between">
                                                                        <span className="text-sm text-muted-foreground">المبلغ المطلوب</span>
                                                                        <span className="text-lg font-bold text-accent-foreground">{price} د.ل</span>
                                                                </div>
                                                        )}

                                                        <Button
                                                                className="w-full h-12 text-base font-semibold rounded-xl"
                                                                onClick={handleSent}
                                                                disabled={submitting || (provider !== 'bank' && !phone.trim())}
                                                        >
                                                                {submitting ? 'جاري الإرسال...' : 'إرسال طلب الدفع'}
                                                        </Button>
                                                </>
                                        )}

                                        {step === 'waiting' && (
                                                <div className="flex flex-col items-center py-10 space-y-6">
                                                        {/* Animated payment indicator */}
                                                        <div className="relative size-28">
                                                                {/* Outer pulsing ring */}
                                                                <div
                                                                        className="absolute inset-0 rounded-full border-2 border-orange/20 animate-ping opacity-75"
                                                                        style={{ animationDuration: '2s' }}
                                                                />
                                                                {/* Middle ring */}
                                                                <div className="absolute inset-2 rounded-full border border-orange/30" />
                                                                {/* Inner icon */}
                                                                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg shadow-orange/25">
                                                                        <Smartphone className="size-8 text-orange-foreground" />
                                                                </div>
                                                        </div>

                                                        {/* Title */}
                                                        <div className="text-center space-y-1.5">
                                                                <p className="text-base font-bold">في انتظار تأكيد الدفع</p>
                                                                <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                                                                        {/* All providers wait for admin approval */}
                                                                        &quot;بعد التحويل، انتظر موافقة الإدارة&quot;
                                                                </p>
                                                        </div>

                                                        {/* Live status indicator */}
                                                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/20">
                                                                <span className="relative flex size-2">
                                                                        <span className="absolute inset-0 rounded-full bg-orange animate-ping opacity-75" />
                                                                        <span className="relative rounded-full size-2 bg-orange" />
                                                                </span>
                                                                <span className="text-2xs text-muted-foreground">
                                                                        {provider === 'libyana' ? 'بانتظار تأكيد التحويل' : 'بانتظار موافقة الإدارة'}
                                                                </span>
                                                        </div>

                                                        {/* All providers (libyana/madar/bank) wait for ADMIN approval —
                                                           the honest status pill above replaces the old libyana-only
                                                           countdown bar, which froze at "30 ثانية" and implied an
                                                           auto-verification that never happens (round79 Stage C fix). */}
                                                </div>
                                        )}

                                        {step === 'approved' && (
                                                <div className="flex flex-col items-center py-8 space-y-6">
                                                        <m.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                className="relative size-20"
                                                        >
                                                                <div
                                                                        className="absolute inset-0 rounded-full bg-success/20 animate-ping opacity-75"
                                                                        style={{ animationDuration: '1.5s' }}
                                                                />
                                                                <div className="relative size-full rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center shadow-lg shadow-success/30">
                                                                        <CheckCircle2 className="size-10 text-success-foreground" />
                                                                </div>
                                                        </m.div>
                                                        <div className="text-center space-y-2">
                                                                <m.p
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="text-lg font-bold text-success"
                                                                >
                                                                        تم الموافقة على الاشتراك
                                                                </m.p>
                                                                <m.p
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ delay: 0.15 }}
                                                                        className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed"
                                                                >
                                                                        {resolutionMsg}
                                                                </m.p>
                                                        </div>
                                                        <m.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                transition={{ delay: 0.3 }}
                                                        >
                                                                <Button
                                                                        className="w-full h-11 rounded-xl bg-success hover:bg-success/90 text-success-foreground"
                                                                        onClick={() => {
                                                                                onOpenChange(false);
                                                                                onSuccess();
                                                                        }}
                                                                >
                                                                        الانتقال إلى لوحة التحكم
                                                                </Button>
                                                        </m.div>
                                                </div>
                                        )}

                                        {step === 'rejected' && (
                                                <div className="flex flex-col items-center py-8 space-y-6">
                                                        <m.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                className="relative size-20"
                                                        >
                                                                <div
                                                                        className="absolute inset-0 rounded-full bg-destructive/20 animate-ping opacity-75"
                                                                        style={{ animationDuration: '1.5s' }}
                                                                />
                                                                <div className="relative size-full rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shadow-lg shadow-destructive/30">
                                                                        <XCircle className="size-10 text-destructive-foreground" />
                                                                </div>
                                                        </m.div>
                                                        <div className="text-center space-y-2">
                                                                <m.p
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="text-lg font-bold text-destructive"
                                                                >
                                                                        تم رفض طلب الاشتراك
                                                                </m.p>
                                                                <m.p
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        transition={{ delay: 0.15 }}
                                                                        className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed"
                                                                >
                                                                        {resolutionMsg}
                                                                </m.p>
                                                        </div>
                                                        <m.div
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                transition={{ delay: 0.3 }}
                                                                className="flex gap-2 w-full"
                                                        >
                                                                <Button
                                                                        variant="outline"
                                                                        className="flex-1 h-11 rounded-xl"
                                                                        onClick={() => {
                                                                                handleOpenChange(false);
                                                                        }}
                                                                >
                                                                        إغلاق
                                                                </Button>
                                                                <Button
                                                                        className="flex-1 h-11 rounded-xl"
                                                                        onClick={() => {
                                                                                setStep('form');
                                                                                setResolutionMsg('');
                                                                                setPhone('');
                                                                                setBankAmount(price);
                                                                                setSenderAccountName('');
                                                                                setSenderAccountNumber('');
                                                                                setReceiptImageUrl('');
                                                                                setPaymentId(null);
                                                                        }}
                                                                >
                                                                        إعادة المحاولة
                                                                </Button>
                                                        </m.div>
                                                </div>
                                        )}

                                        {/* Success screen — just acknowledge, don't redirect (payment is still pending) */}
                                        {step === 'success' && (
                                                <div className="flex flex-col items-center py-8 space-y-6">
                                                        <div className="relative size-20">
                                                                <div className="absolute inset-0 rounded-full bg-success/10 animate-scale-in" />
                                                                <div className="relative size-full rounded-full bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center">
                                                                        <CheckCircle2 className="size-10 text-success" />
                                                                </div>
                                                        </div>
                                                        <div className="text-center space-y-1">
                                                                <p className="text-base font-bold">تم إرسال طلب الدفع</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                        سيتم تفعيل اشتراكك بعد موافقة الإدارة
                                                                </p>
                                                        </div>
                                                        <Button
                                                                className="w-full h-11 rounded-xl"
                                                                variant="outline"
                                                                onClick={() => {
                                                                        handleOpenChange(false);
                                                                }}
                                                        >
                                                                إغلاق
                                                        </Button>
                                                </div>
                                        )}
                                </div>
                        </DialogContent>
                </Dialog>
        );
}
