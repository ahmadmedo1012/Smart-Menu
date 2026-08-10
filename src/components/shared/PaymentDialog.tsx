'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {Smartphone, Landmark, CheckCircle2, XCircle, Loader2} from 'lucide-react';
import AnimatedUpload from '@/components/ui/upload-icon';
import AnimatedCopy from '@/components/ui/copy-icon';
import { useConfig } from '@/hooks/useConfig';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { compressImage } from '@/lib/image-compress';

type Provider = 'libyana' | 'madar' | 'bank';

interface PaymentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	planId: number;
	planName: string;
	planNameAr: string;
	price: number;
	onSuccess: () => void;
	tempRestaurants?: { name: string; slug: string }[];
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
	upgradeRestaurantId,
}: PaymentDialogProps) {
	const [provider, setProvider] = useState<Provider>('libyana');
	// Mobile wallets (libyana/madar) cap at 99 LYD — plans above that require bank transfer
	const requiresBank = Number(price) > 99;
	// Auto-switch to bank when the plan exceeds the wallet cap
	useEffect(() => {
		if (requiresBank && (provider === 'libyana' || provider === 'madar')) {
			setProvider('bank');
		}
	}, [requiresBank, provider]);
	const { config } = useConfig();
	const MADAR_PHONE = (config?.balance_transfer_phone_1 as string) || '0910089975';
	const LIBYANA_PHONE = (config?.balance_transfer_phone_2 as string) || '0942119637';

	const [phone, setPhone] = useState('');
	const [bankAmount, setBankAmount] = useState(price);
	const [senderAccountName, setSenderAccountName] = useState('');
	const [senderAccountNumber, setSenderAccountNumber] = useState('');
	const [receiptImageUrl, setReceiptImageUrl] = useState('');
	const [uploadingReceipt, setUploadingReceipt] = useState(false);
	const [step, setStep] = useState<'form' | 'waiting' | 'success' | 'approved' | 'rejected'>(
		'form'
	);
	const [resolutionMsg, setResolutionMsg] = useState('');
	const [countdown, setCountdown] = useState(30);
	const [submitting, setSubmitting] = useState(false);
	const [paymentId, setPaymentId] = useState<number | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const providerPhone = provider === 'libyana' ? LIBYANA_PHONE : MADAR_PHONE;
	const providerName = provider === 'libyana' ? 'ليبيانا' : 'مدار';

	// Bank account details from SystemConfig (same mechanism as the phones)
	const BANK_NAME = (config?.bank_transfer_bank_name as string) || '';
	const BANK_ACCOUNT = (config?.bank_transfer_account_number as string) || '';
	const BANK_IBAN = (config?.bank_transfer_iban as string) || '';

	const quickTransferCode =
		provider === 'libyana'
			? `*122*218${LIBYANA_PHONE.slice(1)}*${price * 1000}*1#`
			: `*140*4*1*${price}*${MADAR_PHONE}#`;

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

	const cleanup = useCallback(() => {
		if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
	}, []);

	const handleSent = async () => {
		const isBank = provider === 'bank';
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
					...(upgradeRestaurantId ? { upgradeRestaurantId } : {}),
				}),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'فشل إرسال طلب الدفع');
			setPaymentId(json.data.id);
			setStep('waiting');
			setCountdown(30);
		} catch (e: any) {
			premiumToast('error', e.message);
		} finally {
			setSubmitting(false);
		}
	};

	const finishFlow = useCallback(() => {
		cleanup();
		onOpenChange(false);
		onSuccess();
	}, [cleanup, onOpenChange, onSuccess]);

	const deadlineRef = useRef(0);

	// Smooth countdown tick + poll for admin approval
	useEffect(() => {
		if (step !== 'waiting') return;

		// Auto-verify countdown is libyana-only — bank/madar always wait for admin review
		const autoVerify = provider === 'libyana';
		deadlineRef.current = Date.now() + 30000;
		const tick = setInterval(() => {
			if (!autoVerify) return;
			const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
			setCountdown(remaining);
			if (remaining <= 0) {
				clearInterval(tick);
				cleanup();
				setStep('success');
			}
		}, 100);

		if (paymentId && (provider === 'libyana' || provider === 'madar' || provider === 'bank')) {
			let pollFailures = 0;
			const warnedRef = { current: false };
			pollRef.current = setInterval(async () => {
				try {
					const res = await fetch(`/api/subscriptions/status?id=${paymentId}`);
					const json = await res.json();
					pollFailures = 0;
					if (json.data?.status === 'verified') {
						clearInterval(tick);
						cleanup();
						setResolutionMsg('تم الموافقة على اشتراكك بنجاح! سيتم توجيهك إلى لوحة التحكم.');
						setStep('approved');
					}
					if (json.data?.status === 'cancelled') {
						clearInterval(tick);
						cleanup();
						setResolutionMsg(
							json.data?.message ||
								'عذراً، تم رفض طلب تفعيل الاشتراك. يمكنك تعديل البيانات والمحاولة مرة أخرى.'
						);
						setStep('rejected');
					}
				} catch {
					pollFailures++;
					if (pollFailures >= 3 && !warnedRef.current) {
						warnedRef.current = true;
						premiumToast('error', 'تعذر الاتصال بالخادم — تحقق من اتصالك بالإنترنت');
					}
				}
			}, 5000);
		}

		return () => {
			clearInterval(tick);
			cleanup();
		};
	}, [step, paymentId, provider, cleanup, finishFlow]);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				cleanup();
				setStep('form');
				setCountdown(30);
				setPhone('');
				setBankAmount(price);
				setSenderAccountName('');
				setSenderAccountNumber('');
				setReceiptImageUrl('');
				setPaymentId(null);
			}
			onOpenChange(open);
		},
		[onOpenChange, price, cleanup]
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-sm sm:max-w-md rounded-2xl p-0 gap-0 max-h-[90dvh] overflow-y-auto border-border/50 shadow-2xl">
				{/* Header */}
				<div className="bg-gradient-to-br from-orange to-orange/80 text-white p-6">
					<div className="flex items-center gap-2 mb-2">
						<Smartphone className="size-5" />
						<DialogTitle className="text-white text-lg font-bold">دفع الاشتراك</DialogTitle>
					</div>
					<DialogDescription className="text-white/70 text-sm">
						ادفع عبر المحفظة الإلكترونية
					</DialogDescription>
				</div>

				<div className="p-5 space-y-5">
					{/* Plan summary */}
					<div className="rounded-xl bg-orange-muted/50 dark:bg-orange-muted/20 border border-orange/15 p-4">
						<div className="flex justify-between items-center">
							<span className="font-bold">{planNameAr}</span>
							<span className="text-lg font-bold text-orange">{price} د.ل</span>
						</div>
						<p className="text-xs text-muted-foreground mt-0.5">اشتراك شهري</p>
					</div>

					{step === 'form' && (
						<>
							{/* Payment method tabs */}
							<div>
								<Label>طريقة الدفع</Label>
								<div className="grid grid-cols-3 gap-2 mt-1.5">
									{[
										{ id: 'libyana' as Provider, label: 'ليبيانا', icon: Smartphone, disabled: requiresBank },
										{ id: 'madar' as Provider, label: 'مدار', icon: Smartphone, disabled: requiresBank },
										{ id: 'bank' as Provider, label: 'تحويل بنكي', icon: Landmark, disabled: false },
									].map((opt) => {
										const Icon = opt.icon;
										return (
											<button
												key={opt.id}
												type="button"
												onClick={() => setProvider(opt.id)}
												disabled={opt.disabled}
												className={cn(
													'h-14 rounded-xl border-2 text-[13px] font-medium transition-all flex flex-col items-center justify-center gap-1',
													'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50',
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
									<p className="text-xs text-orange mt-2">
										المبالغ فوق 99 د.ل تتطلب تحويل بنكي — اختر &quot;تحويل بنكي&quot; لإتمام الدفع
									</p>
								)}
							</div>

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
												className="size-10 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent transition-colors"
												title="نسخ الرقم"
											>
												<AnimatedCopy className="size-3.5" />
											</button>
										</div>
									</div>

									{/* Quick transfer code */}
									<div className="rounded-xl bg-gradient-to-br from-green-50/80 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/10 border border-green-200/30 dark:border-green-800/20 p-3">
										<p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1.5">
											رمز التحويل السريع
										</p>
										<div className="flex items-center justify-between gap-2">
											<span className="font-mono text-sm font-bold text-orange truncate" dir="ltr">
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
													className="h-9 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
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
										<Label>رقم هاتفك</Label>
										<Input
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											placeholder="09XXXXXXXXX"
											inputMode="numeric"
											maxLength={10}
											className="h-11 rounded-xl mt-1.5 text-left font-mono"
											dir="ltr"
										/>
										<p className="text-[11px] text-muted-foreground mt-1">
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
											{ label: 'المصرف', value: BANK_NAME },
											{ label: 'رقم الحساب', value: BANK_ACCOUNT },
											{ label: 'IBAN', value: BANK_IBAN },
										].map((row) => (
											<div key={row.label} className="flex items-center justify-between gap-2">
												<span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
												<span className="font-mono text-sm font-bold text-left truncate" dir="ltr">
													{row.value}
												</span>
												<button
													type="button"
													onClick={() => copyToClipboard(row.value)}
													className="size-10 rounded-lg border border-border/30 flex items-center justify-center hover:bg-accent transition-colors shrink-0"
													title={`نسخ ${row.label}`}
												>
													<AnimatedCopy className="size-4" />
												</button>
											</div>
										))}
									</div>

									{/* Bank amount — no 99 cap (server enforces plan price) */}
									<div>
										<Label>المبلغ (د.ل)</Label>
										<Input
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
										<Label>اسم صاحب الحساب المُرسِل *</Label>
										<Input
											value={senderAccountName}
											onChange={(e) => setSenderAccountName(e.target.value)}
											placeholder="الاسم كما يظهر في الحساب"
											className="h-11 rounded-xl mt-1.5"
										/>
									</div>

									{/* Sender account number */}
									<div>
										<Label>رقم حساب المُرسِل *</Label>
										<Input
											value={senderAccountNumber}
											onChange={(e) => setSenderAccountNumber(e.target.value)}
											placeholder="رقم الحساب الذي حُوّل منه"
											className="h-11 rounded-xl mt-1.5 text-left font-mono"
											dir="ltr"
										/>
									</div>

									{/* Receipt upload — optional */}
									<div>
										<Label>صورة التحويل (اختياري)</Label>
										<div className="flex items-center gap-2 mt-1.5">
											<label
												className="h-11 px-4 rounded-xl border border-border/30 flex items-center justify-center gap-2 hover:bg-accent cursor-pointer text-sm text-muted-foreground"
												style={{
													opacity: uploadingReceipt ? 0.5 : 1,
													pointerEvents: uploadingReceipt ? 'none' : 'auto',
												}}
											>
												<input
													type="file"
													accept="image/*"
													className="hidden"
													disabled={uploadingReceipt}
													onChange={async (e) => {
														const file = e.target.files?.[0];
														if (!file) return;
														setUploadingReceipt(true);
														premiumToast('info', 'جاري رفع الصورة...');
														try {
															const compressed = await compressImage(file);
															const fd = new FormData();
															fd.append('file', compressed, file.name.replace(/\.[^.]+$/, '.jpg'));
															const r = await csrfFetch('/api/upload', {
																method: 'POST',
																body: fd,
															});
															const d = await r.json();
															if (!r.ok) {
																premiumToast('error', d?.error || 'فشل رفع الصورة');
																return;
															}
															if (d.data?.url) setReceiptImageUrl(d.data.url);
															else premiumToast('error', 'فشل رفع الصورة');
														} catch (err) {
															premiumToast(
																'error',
																err instanceof Error ? err.message : 'فشل رفع الصورة'
															);
														} finally {
															setUploadingReceipt(false);
														}
													}}
												/>
												{uploadingReceipt ? (
													<Loader2 className="size-4 text-muted-foreground animate-spin" />
												) : (
													<AnimatedUpload className="size-4 text-muted-foreground" />
												)}
												{uploadingReceipt ? 'جاري الرفع...' : 'اختر صورة'}
											</label>
											{receiptImageUrl && (
												<button
													type="button"
													onClick={() => setReceiptImageUrl('')}
													className="text-xs text-red-500 hover:underline shrink-0"
												>
													حذف الصورة
												</button>
											)}
										</div>
										{receiptImageUrl && (
											<div className="mt-2 rounded-md overflow-hidden size-20 border border-border/30">
												<OptimizedImage
													src={receiptImageUrl}
													alt="صورة التحويل"
													className="size-full"
													skeleton={false}
												/>
											</div>
										)}
									</div>
								</>
							)}

							{provider !== 'bank' && (
								<div className="rounded-xl bg-muted/30 border border-border/20 p-3 flex items-center justify-between">
									<span className="text-sm text-muted-foreground">المبلغ المطلوب</span>
									<span className="text-lg font-bold text-orange">{price} د.ل</span>
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
									<Smartphone className="size-8 text-white" />
								</div>
							</div>

							{/* Title */}
							<div className="text-center space-y-1.5">
								<p className="text-base font-bold">في انتظار تأكيد الدفع</p>
								<p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
									{provider === 'libyana'
										? 'سيتم تأكيد اشتراكك تلقائياً بعد التحويل'
										: 'بعد التحويل، انتظر موافقة الإدارة'}
								</p>
							</div>

							{/* Live status indicator */}
							<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border/20">
								<span className="relative flex size-2">
									<span className="absolute inset-0 rounded-full bg-orange animate-ping opacity-75" />
									<span className="relative rounded-full size-2 bg-orange" />
								</span>
								<span className="text-[11px] text-muted-foreground">
									{provider === 'libyana' ? 'بانتظار تأكيد التحويل' : 'بانتظار موافقة الإدارة'}
								</span>
							</div>

							{/* Auto-verification progress bar — libyana only; bank/madar wait for admin */}
							{provider === 'libyana' && (
								<div className="w-48 space-y-1.5">
									<div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
										<motion.div
											initial={{ scaleX: 0 }}
											animate={{ scaleX: (30 - countdown) / 30 }}
											className="h-full rounded-full bg-gradient-to-r from-orange to-orange/80 origin-left rtl:origin-right"
											transition={{ duration: 0.5 }}
										/>
									</div>
									<p className="text-[10px] text-muted-foreground text-center">
										الإشتراك سينتهي خلال {countdown} ثانية
									</p>
								</div>
							)}
						</div>
					)}

					{step === 'approved' && (
						<div className="flex flex-col items-center py-8 space-y-6">
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="relative size-20"
							>
								<div
									className="absolute inset-0 rounded-full bg-green-500/20 animate-ping opacity-75"
									style={{ animationDuration: '1.5s' }}
								/>
								<div className="relative size-full rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-green-500/30">
									<CheckCircle2 className="size-10 text-white" />
								</div>
							</motion.div>
							<div className="text-center space-y-2">
								<motion.p
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className="text-lg font-bold text-green-600 dark:text-green-400"
								>
									تم الموافقة على الاشتراك
								</motion.p>
								<motion.p
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.15 }}
									className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed"
								>
									{resolutionMsg}
								</motion.p>
							</div>
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.3 }}
							>
								<Button
									className="w-full h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white"
									onClick={() => {
										onOpenChange(false);
										onSuccess();
									}}
								>
									الانتقال إلى لوحة التحكم
								</Button>
							</motion.div>
						</div>
					)}

					{step === 'rejected' && (
						<div className="flex flex-col items-center py-8 space-y-6">
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className="relative size-20"
							>
								<div
									className="absolute inset-0 rounded-full bg-red-500/20 animate-ping opacity-75"
									style={{ animationDuration: '1.5s' }}
								/>
								<div className="relative size-full rounded-full bg-gradient-to-br from-red-500 to-rose-400 flex items-center justify-center shadow-lg shadow-red-500/30">
									<XCircle className="size-10 text-white" />
								</div>
							</motion.div>
							<div className="text-center space-y-2">
								<motion.p
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className="text-lg font-bold text-red-600 dark:text-red-400"
								>
									تم رفض طلب الاشتراك
								</motion.p>
								<motion.p
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.15 }}
									className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed"
								>
									{resolutionMsg}
								</motion.p>
							</div>
							<motion.div
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
							</motion.div>
						</div>
					)}

					{/* Success screen — just acknowledge, don't redirect (payment is still pending) */}
					{step === 'success' && (
						<div className="flex flex-col items-center py-8 space-y-6">
							<div className="relative size-20">
								<div className="absolute inset-0 rounded-full bg-green-500/10 animate-scale-in" />
								<div className="relative size-full rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center">
									<CheckCircle2 className="size-10 text-green-500" />
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
