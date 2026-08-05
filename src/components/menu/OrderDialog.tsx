'use client';

import { useState, useEffect, useCallback } from 'react';
import {Minus, Plus, Store} from 'lucide-react';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';;
import { MotionCheck } from '@/components/ui/motion-icons';;
import AnimatedX from '@/components/ui/x-icon';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { MenuItemProp } from './MenuItemCard';
import { toArabicNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { useCart } from '@/store/cart';

type OrderDialogProps = {
	item: MenuItemProp | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	restaurantWhatsapp?: string;
	restaurantName?: string;
	restaurantId: number;
	restaurantLogo?: string;
};

const QUICK_NOTES = ['بدون سكر', 'سكر زيادة', 'بدون ثلج', 'حار', 'بارد', 'بدون بصل'];

export function OrderDialog({
	item,
	open,
	onOpenChange,
	restaurantWhatsapp,
	restaurantName,
	restaurantId,
	restaurantLogo,
}: OrderDialogProps) {
	const [isMobile, setIsMobile] = useState(false);
	useEffect(() => {
		setIsMobile(window.innerWidth < 640);
	}, []);
	const [notes, setNotes] = useState('');
	const [quantity, setQuantity] = useState(1);
	const [submitting, setSubmitting] = useState(false);
	const [orderType, setOrderType] = useState<'inside' | 'delivery' | 'takeaway'>('inside');
	const [customerName, setCustomerName] = useState('');
	const [customerPhone, setCustomerPhone] = useState('');
	const [confirmed, setConfirmed] = useState(false);
	const cartPickupType = useCart((s) => s.pickupType);

	useEffect(() => {
		if (open) {
			setNotes('');
			setQuantity(1);
			setSubmitting(false);
			setConfirmed(false);
			setOrderType(cartPickupType ?? 'inside');
			setCustomerName('');
			setCustomerPhone('');
		}
	}, [open, item?.id, cartPickupType]);

	const handleConfirm = useCallback(() => {
		if (!item) return null;
		if (!restaurantWhatsapp) return;
		setSubmitting(true);

		const displayName = item.nameAr || item.name;
		const currentPrice = item.discountedPrice ?? item.price;

		// Sync item to cart store (unified path with MenuPageClient)
		const addItem = useCart.getState().addItem;
		const setCustomerInfo = () => {
			const s = useCart.getState();
			if (customerName.trim()) s.setCustomerName(customerName.trim());
			if (customerPhone.trim()) s.setCustomerPhone(customerPhone.trim());
			s.setPickupType(orderType);
			s.setOrderNotes(notes.trim());
		};
		// Add item with quantity matching dialog selection
		for (let i = 0; i < quantity; i++) {
			addItem({
				itemId: item.id,
				name: displayName,
				price: currentPrice,
				image: item.image || undefined,
				restaurantId,
			});
		}
		// Set notes on the cart item(s)
		const cartItem = useCart.getState().items.find((i) => i.itemId === item.id);
		if (cartItem && notes.trim()) {
			useCart.getState().updateNotes(cartItem.id, notes.trim());
		}
		setCustomerInfo();

		setSubmitting(false);
		setConfirmed(true);
		setTimeout(() => {
			onOpenChange(false);
			// Redirect to unified cart page where user reviews + sends WhatsApp
			window.location.href = '/cart';
		}, 800);
	}, [
		item,
		restaurantWhatsapp,
		customerName,
		customerPhone,
		orderType,
		notes,
		quantity,
		restaurantId,
		onOpenChange,
	]);

	const toggleQuickNote = (note: string) => {
		setNotes((prev) => {
			if (prev.includes(note)) return prev.replace(note, '').replace(/\s+/g, ' ').trim();
			return prev ? `${prev}، ${note}` : note;
		});
	};

	if (!item) return null;

	const displayName = item.nameAr || item.name;
	const currentPrice = item.discountedPrice ?? item.price;
	const totalPrice = currentPrice * quantity;
	const hasDiscount = item.discountedPrice !== null && item.discountedPrice < item.price;

	const glassPillInput =
		'h-11 rounded-xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border px-4 text-sm outline-none transition-all focus-visible:border-orange/40 focus-visible:ring-4 focus-visible:ring-orange/10';
	const glassPillCard = 'rounded-xl bg-glass-bg/50 backdrop-blur-sm border border-glass-border';

	const innerContent = (
		<>
			{/* Screen-reader name — base-ui warns and SR announces bare "dialog" without a Title */}
			<DialogTitle className="sr-only">{displayName}</DialogTitle>
			{/* Image header with gradient overlay */}
			{item.image && (
				<div className="relative h-44 sm:h-52 overflow-hidden">
					<OptimizedImage
						src={item.image}
						alt={displayName}
						className="size-full"
						aspectRatio="video"
						skeleton
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
					<button
						type="button"
						onClick={() => onOpenChange(false)}
						className="absolute top-3 start-3 size-10 rounded-lg bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm flex items-center justify-center"
						aria-label="إغلاق"
					>
						<AnimatedX className="size-4" />
					</button>
					<div className="absolute bottom-4 end-4 start-16">
						<h3 className="text-white font-bold text-xl drop-shadow-lg">{displayName}</h3>
					</div>
				</div>
			)}

			{confirmed ? (
				<div className="p-10 text-center animate-scale-in">
					<div className="size-20 rounded-2xl bg-glass-bg/60 backdrop-blur-sm border border-glass-border flex items-center justify-center mx-auto mb-4">
						<MotionCheck className="size-10 text-orange" />
					</div>
					<div className="size-16 rounded-full bg-orange flex items-center justify-center mx-auto -mt-24 mb-6 shadow-lg shadow-orange/30">
						<MotionCheck className="size-10 text-white" />
					</div>
					<h3 className="text-xl font-bold mb-1">تم إرسال الطلب!</h3>
					<p className="text-sm text-muted-foreground">جاري تحويلك إلى واتساب...</p>
				</div>
			) : (
				<div className={cn('p-5 space-y-4', !item.image && 'pt-8')}>
					{!item.image && (
						<div className="text-center pb-2">
							<h3 className="text-xl font-bold mb-1">{displayName}</h3>
						</div>
					)}

					{/* Restaurant info bar — glass-card */}
					<div className="glass-card rounded-xl p-3 flex items-center gap-3">
						<div className="size-12 rounded-xl bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shrink-0 shadow-md">
							{restaurantLogo ? (
								<OptimizedImage
									src={restaurantLogo}
									alt=""
									className="size-full"
									skeleton={false}
								/>
							) : (
								<Store className="size-6 text-white" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-bold text-sm">{restaurantName || 'المطعم'}</p>
							<p className="text-xs text-muted-foreground">طلب جديد</p>
						</div>
						{hasDiscount && (
							<span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
								-{Math.round((1 - item.discountedPrice! / item.price) * 100)}%
							</span>
						)}
					</div>

					{/* Customer info — glass-pill inputs */}
					<div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
						<input
							id="customer-name"
							name="customerName"
							value={customerName}
							onChange={(e) => setCustomerName(e.target.value)}
							placeholder="الاسم (اختياري)"
							maxLength={30}
							aria-label="الاسم"
							className={glassPillInput}
						/>
						<input
							id="customer-phone"
							name="customerPhone"
							value={customerPhone}
							onChange={(e) => setCustomerPhone(e.target.value)}
							placeholder="رقم الهاتف (اختياري)"
							maxLength={15}
							dir="ltr"
							aria-label="رقم الهاتف"
							className={cn(glassPillInput, 'text-left')}
						/>
					</div>

					{/* Quantity selector — glass-card */}
					<div className={cn(glassPillCard, 'flex items-center justify-between p-4')}>
						<div>
							<span className="text-xs text-muted-foreground">السعر</span>
							<div className="flex items-baseline gap-1.5 mt-0.5">
								<span className="font-bold text-xl text-primary tabular-nums">
									{toArabicNumber(currentPrice.toFixed(1))}
								</span>
								<span className="text-xs text-muted-foreground">د.ل</span>
							</div>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setQuantity(Math.max(1, quantity - 1))}
								disabled={quantity <= 1}
								className="size-11 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm flex items-center justify-center hover:bg-orange/10 hover:border-orange/30 disabled:opacity-30 transition-all"
								aria-label="إنقاص الكمية"
							>
								<Minus className="size-4" />
							</button>
							<span className="font-bold text-xl min-w-[2.5ch] text-center tabular-nums">
								{toArabicNumber(quantity)}
							</span>
							<button
								type="button"
								onClick={() => setQuantity(Math.min(99, quantity + 1))}
								disabled={quantity >= 99}
								className="size-11 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm flex items-center justify-center hover:bg-orange/10 hover:border-orange/30 disabled:opacity-30 transition-all"
								aria-label="زيادة الكمية"
							>
								<Plus className="size-4" />
							</button>
						</div>
					</div>

					{/* Order type — segmented with bg-orange active */}
					<div className={cn(glassPillCard, 'flex p-1 gap-1')}>
						{(['inside', 'delivery', 'takeaway'] as const).map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => setOrderType(type)}
								className={cn(
									'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all',
									orderType === type
										? 'bg-orange text-white shadow-md'
										: 'text-muted-foreground hover:text-foreground'
								)}
							>
								{type === 'delivery' ? 'توصيل' : type === 'inside' ? 'داخلي' : 'استلام'}
							</button>
						))}
					</div>

					{/* Quick notes — glass-pill chips */}
					<div>
						<label className="text-sm font-medium mb-2 block">إضافات</label>
						<div className="flex flex-wrap gap-1.5">
							{QUICK_NOTES.map((note) => (
								<button
									key={note}
									type="button"
									onClick={() => toggleQuickNote(note)}
									className={cn(
										'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border',
										notes.includes(note)
											? 'bg-orange/10 border-orange/30 text-orange'
											: 'bg-glass-bg/30 border-glass-border text-muted-foreground hover:border-orange/30 hover:text-foreground'
									)}
								>
									{note}
								</button>
							))}
						</div>
					</div>

					{/* Notes textarea — glass-pill */}
					<textarea
						id="order-notes"
						name="notes"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="ملاحظات إضافية للطلب..."
						rows={2}
						aria-label="ملاحظات إضافية"
						className={cn(glassPillInput, 'h-auto py-3 resize-none')}
					/>

					{/* Total + WhatsApp */}
					<div className="space-y-3 pt-1">
						<div className="flex items-center justify-between border-t border-dashed border-glass-border pt-3">
							<span className="font-bold text-sm">المجموع</span>
							<span className="font-bold text-2xl text-primary tabular-nums">
								{toArabicNumber(totalPrice.toFixed(1))}{' '}
								<span className="text-sm font-normal text-muted-foreground">د.ل</span>
							</span>
						</div>
						<button
							type="button"
							className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/20 text-white flex items-center justify-center gap-2 text-base font-bold transition-all active:scale-[0.98]"
							onClick={handleConfirm}
							disabled={submitting || !restaurantWhatsapp}
						>
							{submitting ? (
								<span className="flex items-center gap-2">
									<span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
									جاري...
								</span>
							) : (
								<>
									<AnimatedMessageCircle className="size-5 text-white" /> أرسل الطلب عبر واتساب
								</>
							)}
						</button>
						{!restaurantWhatsapp && (
							<p className="text-[11px] text-center text-destructive">
								لم يتم إعداد واتساب بعد للمطعم. يُرجى التواصل مع المطعم مباشرة.
							</p>
						)}
						<p className="text-[11px] text-center text-muted-foreground/60">
							سيتم فتح واتساب مع رسالة الطلب لإرسالها مباشرة
						</p>
					</div>
				</div>
			)}
		</>
	);

	const sharedProps = {
		open,
		onOpenChange: ((o: boolean) => {
			if (!o && !submitting) onOpenChange(false);
		}) as (open: boolean) => void,
	};
	// ponytail: two render paths — CSS approach would need display:none hack, this is cleaner
	return isMobile ? (
		<Sheet {...sharedProps}>
			<SheetContent
				side="bottom"
				className="gap-0 p-0 max-h-[90dvh] overflow-y-auto rounded-t-2xl glass-strong"
				showCloseButton={true}
			>
				{innerContent}
			</SheetContent>
		</Sheet>
	) : (
		<Dialog {...sharedProps}>
			<DialogContent
				className="sm:max-w-md gap-0 p-0 overflow-hidden rounded-2xl glass-strong max-h-[90dvh] overflow-y-auto"
				showCloseButton={true}
			>
				{innerContent}
			</DialogContent>
		</Dialog>
	);
}
