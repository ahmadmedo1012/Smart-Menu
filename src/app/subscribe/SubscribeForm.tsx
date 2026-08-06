'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toArabicNumber } from '@/lib/format';
import { Sparkles, Star, Crown, Building2, type LucideIcon } from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '@/lib/constants';

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
	Pro: 'from-orange-500 to-rose-600',
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
	step: _step,
	onStepChange,
	onFormChange,
}: {
	plans: Plan[];
	selectedPlan: number | null;
	form: FormState;
	step: 'plan' | 'form';
	onStepChange: (s: 'plan' | 'form') => void;
	onFormChange: (f: FormState) => void;
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

	const updateRestaurant = (index: number, patch: Partial<RestaurantInput>) => {
		const next = menus.map((r, i) => (i === index ? { ...r, ...patch } : r));
		onFormChange({ ...form, restaurants: next });
		setSubmitted(false);
	};

	const addRestaurant = () => {
		if (!canAddMenu) return;
		onFormChange({ ...form, restaurants: [...menus, { ...EMPTY_RESTAURANT }] });
	};

	const removeRestaurant = (index: number) => {
		if (menus.length <= 1) return; // keep at least one
		onFormChange({ ...form, restaurants: menus.filter((_, i) => i !== index) });
	};

	if (!currentPlan) return null;

	return (
		<div className="animate-fade-in max-w-lg mx-auto">
			{/* Selected plan summary */}
			<div
				className={cn(
					'rounded-md p-5 mb-8 border-2 border-orange/30 bg-gradient-to-r from-orange-muted/80 to-white dark:from-orange-muted/20 dark:to-card'
				)}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div
							className={cn(
								'size-10 rounded-[4px] bg-gradient-to-br flex items-center justify-center',
								PLAN_GRADIENTS[currentPlan.name] ?? 'from-orange to-orange/80'
							)}
						>
							{(() => {
								const Icon =
									PLAN_ICONS[currentPlan.name] || Sparkles;
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
					<Button variant="ghost" size="sm" onClick={() => onStepChange('plan')}>
						تغيير
					</Button>
				</div>
			</div>

			<div className="space-y-5">
				{/* Menus header */}
				<div className="flex items-center justify-between">
					<div>
						<h3 className="font-bold text-base">بيانات المنيوهات</h3>
						<p className="text-xs text-muted-foreground mt-0.5">
							{maxMenus === 9999
								? 'خطتك تدعم منيوهات غير محدودة — أضف ما تشاء الآن أو لاحقاً'
								: maxMenus > 1
									? `خطتك تدعم حتى ${toArabicNumber(maxMenus)} منيوهات — يمكنك إضافة ${toArabicNumber(maxMenus - menus.length)} ${menus.length >= maxMenus - 1 ? '' : 'آخر/أخرى'} الآن أو لاحقاً من لوحة التحكم`
									: 'خطتك تتضمن منيو واحد'}
						</p>
					</div>
					{canAddMenu && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addRestaurant}
							className="shrink-0"
						>
							+ إضافة منيو
						</Button>
					)}
				</div>

				{/* Restaurant blocks */}
				{menus.map((restaurant, index) => (
					<div
						key={index}
						className="rounded-md border border-border/40 p-4 space-y-4 relative"
					>
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
								<Label>اسم المطعم *</Label>
								<Input
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
								<Label>الرابط المختصر *</Label>
								<div className="flex items-center mt-1.5">
									<span className="text-xs text-muted-foreground bg-muted/50 h-11 px-3 rounded-sm border-e-0 border-input flex items-center shrink-0">
										/menu/
									</span>
									<Input
										value={restaurant.slug}
										onChange={(e) =>
											updateRestaurant(index, {
												slug: e.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
											})
										}
										placeholder="الرابط المختصر (مثال: al-waha-cafe)"
										className={cn(
											'h-11 rounded-[4px] -me-[2px] text-left',
											submitted && restaurant.slug.trim().length < 2 && 'border-destructive ring-1 ring-destructive/30'
										)}
										dir="ltr"
										aria-invalid={submitted && restaurant.slug.trim().length < 2 || undefined}
										required
									/>
								</div>
								{submitted && restaurant.slug.trim().length < 2 && (
									<p className="text-xs text-destructive mt-1">الرابط مطلوب (حرفان على الأقل)</p>
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

				{/* Divider */}
				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-border/30" />
					</div>
					<div className="relative flex justify-center">
						<span className="bg-background px-3 text-xs text-muted-foreground">
							بيانات تسجيل الدخول
						</span>
					</div>
				</div>

				{/* Username + Password */}
				<div className="grid grid-cols-2 gap-3">
					<div>
						<Label>اسم المستخدم *</Label>
						<Input
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
					</div>
					<div>
						<Label>كلمة المرور *</Label>
						<Input
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

				{/* Summary */}
				<div className="rounded-md bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20 p-5 mt-6">
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
								{currentPlan.maxMenus === 9999
									? 'غير محدودة'
									: `حتى ${toArabicNumber(currentPlan.maxMenus)}`}
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
								{currentPlan.maxOrders === 99999
									? 'غير محدودة'
									: `حتى ${toArabicNumber(currentPlan.maxOrders)}`}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
