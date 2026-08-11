'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { Sparkles, Star, Crown, Building2, Store, Loader2, type LucideIcon } from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';
import { premiumToast } from '@/lib/premium-toast';
import { MotionArrowLeft, MotionArrowRight } from '@/components/ui/motion-icons';
import { motion, AnimatePresence } from 'motion/react';
import type { WizardStep } from './StepIndicator';

type Plan = {
	id: number;
	name: string;
	nameAr: string;
	price: number;
	periodDays: number;
	features: string[];
	maxMenus: number;
	maxItems: number;
	maxOrders: number;
	sortOrder: number;
};

const PLAN_GRADIENTS: Record<string, string> = {
	Free: 'from-gray-400 to-gray-500',
	Basic: 'from-orange to-orange/80',
	Premium: 'from-orange to-orange/80',
	Pro: 'from-orange to-rose-600',
	Enterprise: 'from-rose-500 to-orange-600',
};
const PLAN_ICONS: Record<string, LucideIcon> = {
	Free: Sparkles,
	Basic: Star,
	Premium: Crown,
	Pro: Building2,
	Enterprise: Building2,
};

interface RestaurantInput {
	name: string;
	slug: string;
	description: string;
	phone: string;
	whatsapp: string;
}

interface FormState {
	restaurants: RestaurantInput[];
	username: string;
	password: string;
}

const EMPTY_RESTAURANT: RestaurantInput = {
	name: '',
	slug: '',
	description: '',
	phone: '',
	whatsapp: '',
};

export function SubscribeForm({
	plans,
	selectedPlan,
	form,
	step,
	submitting,
	onStepChange,
	onFormChange,
	onRetryPlans,
}: {
	plans: Plan[];
	selectedPlan: number | null;
	form: FormState;
	step: WizardStep;
	submitting: boolean;
	onStepChange: (s: WizardStep) => void;
	onFormChange: (f: FormState) => void;
	onRetryPlans?: () => void;
}) {
	const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
	const [submitted, setSubmitted] = useState(false);

	const touchField = (field: string) => setFieldTouched((prev) => ({ ...prev, [field]: true }));
	const fieldError = (field: string) => {
		const touched = fieldTouched[field] || submitted;
		if (!touched) return false;
		switch (field) {
			case 'username':
				return form.username.trim().length < 3;
			case 'password':
				return form.password.trim().length < PASSWORD_MIN_LENGTH;
			default:
				return false;
		}
	};

	const currentPlan = plans.find((p) => p.id === selectedPlan);
	const maxMenus = Math.max(1, currentPlan?.maxMenus ?? 1);
	const menus = form.restaurants;
	const canAddMenu = menus.length < maxMenus;

	// Per-step validation (slug ≥3 matches server schema)
	const menusValid = menus.every((r) => r.name.trim().length >= 2 && r.slug.trim().length >= 3);
	const accountValid = form.username.trim().length >= 3 && form.password.trim().length >= PASSWORD_MIN_LENGTH;

	const updateRestaurant = (index: number, patch: Partial<RestaurantInput>) => {
		const next = menus.map((r, i) => (i === index ? { ...r, ...patch } : r));
		onFormChange({ ...form, restaurants: next });
		setSubmitted(false);
		setDupErrors({}); // D1 fix: clear stale duplicate errors on edit
	};

	const addRestaurant = () => {
		if (!canAddMenu) return;
		onFormChange({ ...form, restaurants: [...menus, { ...EMPTY_RESTAURANT }] });
		setSubmitted(false); // D3 fix: new empty menu shouldn't show red borders
		setDupErrors({});
	};

	const removeRestaurant = (index: number) => {
		if (menus.length <= 1) return; // keep at least one
		onFormChange({ ...form, restaurants: menus.filter((_, i) => i !== index) });
		setSubmitted(false);
		setDupErrors({});
	};

	const [validating, setValidating] = useState(false);
	const [dupErrors, setDupErrors] = useState<{ username?: string; slug?: string }>({});

	const goNext = async () => {
		if (validating) return; // C1 fix: block double-advance while validation in flight
		if (step === 'menu') {
			if (!menusValid) {
				setSubmitted(true);
				return;
			}
			// Pre-flight duplicate check: slug availability BEFORE advancing
			setValidating(true);
			setDupErrors({});
			try {
				const valRes = await fetch('/api/subscriptions/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						// username not filled yet at menu step — omit to avoid 400
						slugs: menus.map((r) =>
							r.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
						),
					}),
				});
				const valJson = await valRes.json();
				if (!valJson.success || !valJson.data?.valid) {
					const errs = valJson.data?.errors ?? {};
					const slugErr = errs.slug ?? errs.slugs;
					setDupErrors({ username: errs.username, slug: slugErr });
					if (slugErr) premiumToast('error', slugErr);
					return; // stay on menu step
				}
				onStepChange('account');
			} catch {
				premiumToast('error', 'خطأ في التحقق من البيانات');
			} finally {
				setValidating(false);
			}
		} else if (step === 'account') {
			if (!accountValid) {
				setSubmitted(true);
				return;
			}
			// Pre-flight: username availability BEFORE advancing
			setValidating(true);
			setDupErrors({});
			try {
				const valRes = await fetch('/api/subscriptions/validate', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						username: form.username.trim(),
						// slugs already validated at menu step
						slugs: [],
					}),
				});
				const valJson = await valRes.json();
				if (!valJson.success || !valJson.data?.valid) {
					const errs = valJson.data?.errors ?? {};
					const slugErr = errs.slug ?? errs.slugs;
					setDupErrors({ username: errs.username, slug: slugErr });
					if (errs.username) premiumToast('error', errs.username);
					return; // stay on account step
				}
				onStepChange('review');
			} catch {
				premiumToast('error', 'خطأ في التحقق من البيانات');
			} finally {
				setValidating(false);
			}
		}
	};

	if (!currentPlan) {
		// Plans failed to load (deep-link ?plan=N) — offer retry instead of infinite skeleton
		return (
			<div className="animate-fade-in max-w-lg mx-auto py-10 text-center">
				<p className="text-muted-foreground mb-4">تعذر تحميل الخطة المحددة</p>
				<Button type="button" variant="outline" onClick={onRetryPlans}>
					إعادة المحاولة
				</Button>
			</div>
		);
	}

	return (
		<div className="animate-fade-in max-w-lg mx-auto">
			{/* Selected plan summary */}
			<div
				className={cn(
					'rounded-[20px] p-5 mb-8 border-2 border-orange/30 bg-gradient-to-r from-orange-muted/80 to-white dark:from-orange-muted/20 dark:to-card'
				)}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div
							className={cn(
								'size-10 rounded-[20px] bg-gradient-to-br flex items-center justify-center',
								PLAN_GRADIENTS[currentPlan.name] ?? 'from-orange to-orange/80'
							)}
						>
							{(() => {
								const Icon = PLAN_ICONS[currentPlan.name] || Sparkles;
								return <Icon className="size-5 text-white" />;
							})()}
						</div>
						<div>
							<p className="font-bold">{currentPlan.nameAr}</p>
							<p className="text-xs text-muted-foreground">
								{Number(currentPlan.price) === 0 ? 'مجاني' : `${currentPlan.price} د.ل/شهر`}
								{' • '}
								{currentPlan.maxItems === 9999
									? 'أصناف غير محدودة'
									: `حتى ${toArabicNumber(currentPlan.maxItems)} صنف`}
							</p>
						</div>
					</div>
					<Button type="button" variant="ghost" size="sm" onClick={() => onStepChange('plan')}>
						تغيير
					</Button>
				</div>
			</div>

			<AnimatePresence mode="wait">
				<motion.div
					key={step}
					initial={{ opacity: 0, x: 24 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -24 }}
					transition={{ duration: 0.25 }}
				>
					{/* ── STEP: MENU ── */}
					{step === 'menu' && (
						<div className="space-y-5">
							{/* Menus header */}
							<div className="flex items-center justify-between">
								<div>
									<h3 className="font-bold text-base">بيانات المنيوهات</h3>
									<p className="text-xs text-muted-foreground mt-0.5">
										{maxMenus === 9999
											? 'خطتك تدعم منيوهات غير محدودة — أضف ما تشاء الآن أو لاحقاً'
											: maxMenus > 1
												? `خطتك تدعم حتى ${toArabicNumber(maxMenus)} منيوهات`
												: 'خطتك تتضمن منيو واحد'}
									</p>
								</div>
								{canAddMenu && (
									<Button type="button" variant="outline" size="sm" onClick={addRestaurant} className="shrink-0">
										+ إضافة منيو
									</Button>
								)}
							</div>

							{/* Restaurant blocks */}
							{menus.map((restaurant, index) => (
								<div key={index} className="rounded-[20px] border border-border/40 p-4 space-y-4 relative">
									<div className="flex items-center justify-between">
										<h4 className="text-sm font-semibold text-primary">
											المنيو {toArabicNumber(index + 1)}
											{index === 0 && (
												<span className="ms-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
													الأساسي
												</span>
											)}
										</h4>
										{menus.length > 1 && (
											<button
												type="button"
												onClick={() => removeRestaurant(index)}
												className="text-xs text-destructive hover:underline"
											>
												حذف
											</button>
										)}
									</div>

									{/* Restaurant name + slug */}
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label htmlFor={`menu-name-${index}`}>اسم المطعم *</Label>
											<Input
												id={`menu-name-${index}`}
												value={restaurant.name}
												onChange={(e) => updateRestaurant(index, { name: e.target.value })}
												placeholder="اسم المطعم (مثال: مقهى الواحة)"
												className={cn(
													'h-11 mt-1.5',
													submitted && restaurant.name.trim().length < 2 && 'border-destructive ring-1 ring-destructive/30'
												)}
												aria-invalid={submitted && restaurant.name.trim().length < 2 || undefined}
												required
											/>
											{submitted && restaurant.name.trim().length < 2 && (
												<p className="text-xs text-destructive mt-1">اسم المطعم مطلوب (حرفان على الأقل)</p>
											)}
										</div>
										<div>
											<Label htmlFor={`menu-slug-${index}`}>الرابط المختصر *</Label>
											<div className="flex items-center mt-1.5">
												<span className="text-xs text-muted-foreground bg-muted/50 h-11 px-3 rounded-sm border-e-0 border-input flex items-center shrink-0">
													/menu/
												</span>
												<Input
													id={`menu-slug-${index}`}
													value={restaurant.slug}
													onChange={(e) =>
														updateRestaurant(index, {
															slug: e.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
														})
													}
													placeholder="الرابط المختصر (مثال: al-waha-cafe)"
													className={cn(
														'h-11 rounded-[4px] -me-[2px] text-left',
														submitted && restaurant.slug.trim().length < 3 && 'border-destructive ring-1 ring-destructive/30'
													)}
													dir="ltr"
													aria-invalid={submitted && restaurant.slug.trim().length < 3 || undefined}
													required
												/>
											</div>
											{submitted && restaurant.slug.trim().length < 3 && (
												<p className="text-xs text-destructive mt-1">الرابط مطلوب (ثلاثة أحرف على الأقل)</p>
											)}
											{dupErrors.slug && (
												<p className="text-xs text-destructive mt-1">{dupErrors.slug}</p>
											)}
										</div>
									</div>

									{/* Description */}
									<div>
										<Label>الوصف</Label>
										<Input
											value={restaurant.description}
											onChange={(e) => updateRestaurant(index, { description: e.target.value })}
											placeholder="وصف المطعم (اختياري)"
											className="h-11 mt-1.5"
										/>
									</div>

									{/* Phone + WhatsApp */}
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label>رقم الهاتف</Label>
											<Input
												value={restaurant.phone}
												onChange={(e) => updateRestaurant(index, { phone: e.target.value })}
												placeholder="رقم الهاتف (مثال: 0912345678)"
												className="h-11 mt-1.5 text-left"
												dir="ltr"
											/>
										</div>
										<div>
											<Label>رقم واتساب</Label>
											<Input
												value={restaurant.whatsapp}
												onChange={(e) => updateRestaurant(index, { whatsapp: e.target.value })}
												placeholder="رقم الواتساب (مثال: 0912345678)"
												className="h-11 mt-1.5 text-left"
												dir="ltr"
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* ── STEP: ACCOUNT ── */}
					{step === 'account' && (
						<div className="space-y-5">
							<div>
								<h3 className="font-bold text-base">بيانات تسجيل الدخول</h3>
								<p className="text-xs text-muted-foreground mt-0.5">أنشئ حساباً للتحكم بمنيوهاتك من لوحة التحكم</p>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<Label htmlFor="account-username">اسم المستخدم *</Label>
									<Input
										id="account-username"
										value={form.username}
										onChange={(e) => {
											onFormChange({ ...form, username: e.target.value });
											setSubmitted(false);
										}}
										onBlur={() => touchField('username')}
										placeholder="اسم المستخدم (3 أحرف على الأقل)"
										className={cn(
											'h-11 mt-1.5 text-left',
											fieldError('username') && 'border-destructive ring-1 ring-destructive/30'
										)}
										dir="ltr"
										aria-invalid={fieldError('username') || undefined}
										required
									/>
									{fieldError('username') && (
										<p className="text-xs text-destructive mt-1">اسم المستخدم مطلوب (3 أحرف على الأقل)</p>
									)}
									{dupErrors.username && (
										<p className="text-xs text-destructive mt-1">{dupErrors.username}</p>
									)}
								</div>
								<div>
									<Label htmlFor="account-password">كلمة المرور *</Label>
									<Input
										id="account-password"
										type="password"
										value={form.password}
										onChange={(e) => {
											onFormChange({ ...form, password: e.target.value });
											setSubmitted(false);
										}}
										onBlur={() => touchField('password')}
										placeholder={`كلمة المرور (${PASSWORD_MIN_LENGTH} أحرف على الأقل)`}
										className={cn(
											'h-11 mt-1.5',
											fieldError('password') && 'border-destructive ring-1 ring-destructive/30'
										)}
										aria-invalid={fieldError('password') || undefined}
										required
									/>
									{fieldError('password') && (
										<p className="text-xs text-destructive mt-1">
											كلمة المرور مطلوبة ({PASSWORD_MIN_LENGTH} أحرف على الأقل)
										</p>
									)}
								</div>
							</div>
						</div>
					)}

					{/* ── STEP: REVIEW ── */}
					{step === 'review' && (
						<div className="space-y-4">
							<h3 className="font-bold text-base">راجع بياناتك ثم أكّد</h3>

							{/* Restaurants summary */}
							<div className="rounded-[20px] border border-border/40 p-4 space-y-3">
								<div className="flex items-center justify-between">
									<h4 className="text-sm font-semibold">المنيوهات</h4>
									<Button type="button" variant="ghost" size="sm" onClick={() => onStepChange('menu')} className="text-primary">
										تعديل
									</Button>
								</div>
								{menus.map((r, i) => (
									<div key={i} className="flex items-center justify-between text-sm border-b border-border/20 pb-2 last:border-0 last:pb-0">
										<div className="flex items-center gap-2">
											<span className="size-7 rounded-full bg-orange/10 text-orange flex items-center justify-center text-xs font-bold shrink-0">
												{toArabicNumber(i + 1)}
											</span>
											<div>
												<p className="font-medium">{r.name || '—'}</p>
												<p className="text-xs text-muted-foreground" dir="ltr">
													/menu/{r.slug || '—'}
												</p>
											</div>
										</div>
										<span className="text-xs text-muted-foreground">
											{r.phone || r.whatsapp || ''}
										</span>
									</div>
								))}
							</div>

							{/* Account summary */}
							<div className="rounded-[20px] border border-border/40 p-4 flex items-center justify-between">
								<div>
									<h4 className="text-sm font-semibold mb-1">بيانات الدخول</h4>
									<p className="text-sm text-muted-foreground" dir="ltr">
										{form.username}
									</p>
								</div>
								<Button type="button" variant="ghost" size="sm" onClick={() => onStepChange('account')} className="text-primary">
									تعديل
								</Button>
							</div>

							{/* Plan summary */}
							<div className="rounded-[20px] bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20 p-5">
								<h4 className="font-bold mb-3">ملخص الاشتراك</h4>
								<div className="space-y-2 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">الخطة</span>
										<span className="font-medium">{currentPlan.nameAr}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">السعر</span>
										<span className="font-medium">
											{Number(currentPlan.price) === 0 ? 'مجاني' : `${currentPlan.price} د.ل/شهر`}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">المنيوهات</span>
										<span className="font-medium">
											{currentPlan.maxMenus === 9999 ? 'غير محدودة' : `حتى ${toArabicNumber(currentPlan.maxMenus)}`}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">الحد الأقصى للأصناف</span>
										<span className="font-medium">
											{currentPlan.maxItems === 9999 ? 'غير محدود' : toArabicNumber(currentPlan.maxItems)}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">الطلبات</span>
										<span className="font-medium">
											{currentPlan.maxOrders === 99999 ? 'غير محدودة' : `حتى ${toArabicNumber(currentPlan.maxOrders)}`}
										</span>
									</div>
								</div>
							</div>
						</div>
					)}
				</motion.div>
			</AnimatePresence>

			{/* ── Navigation buttons ── */}
			<div className="flex items-center gap-3 mt-8">
				{step !== 'menu' && (
					<Button
						type="button"
						variant="outline"
						size="lg"
						className="h-14 flex-1 rounded-[20px]"
						onClick={() => {
							if (step === 'account') onStepChange('menu');
							else if (step === 'review') onStepChange('account');
						}}
					>
						<MotionArrowRight className="size-5 ms-0 me-2" />
						رجوع
					</Button>
				)}
				{step !== 'review' ? (
					<Button type="button" size="lg" className="h-14 flex-1 rounded-[20px]" onClick={goNext} disabled={validating}>
						{validating ? (
							<span className="flex items-center gap-2">
								<Loader2 className="size-4 animate-spin" /> جاري التحقق...
							</span>
						) : (
							<>
								التالي
								<MotionArrowLeft className="size-5 ms-2" />
							</>
						)}
					</Button>
				) : (
					<Button size="lg" className="h-14 flex-1 rounded-[20px]" type="submit" disabled={submitting}>
						{submitting ? (
							<span className="flex items-center gap-2">
								<Loader2 className="size-4 animate-spin" /> جاري إنشاء الحساب...
							</span>
						) : (
							<>
								<Store className="size-5" /> إنشاء الحساب والبدء
							</>
						)}
					</Button>
				)}
			</div>
			{step === 'review' && (
				<p className="text-xs text-center text-muted-foreground/60 mt-4">
					بالضغط على إنشاء الحساب، أنت توافق على{' '}
					<Link href="/terms" className="text-primary underline">
						شروط الخدمة
					</Link>
				</p>
			)}
		</div>
	);
}
