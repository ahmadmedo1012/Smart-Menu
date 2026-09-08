'use client';
/*
 * item-dialog/ItemCoreFields.tsx — round94 W2-b (inspection-c §2.4):
 * JSX moved VERBATIM from ItemDialog.tsx 453–531 (name/description/price
 * grids — ids `${fId}-name`…`${fId}-disc-price`, placeholder «كابتشينو»)
 * + 593–614 (status toggle buttons). Every synchronous onChange becomes
 * patch({ field: e.target.value }) — values identical. Sanctioned id fix:
 * the broken span id at old line 594 printed literally as `${fId}-status`;
 * it is now a real template literal.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ItemFormState } from './types';

export function ItemCoreFields({
	fId,
	form,
	patch,
}: {
	fId: string;
	form: ItemFormState;
	patch: (p: Partial<ItemFormState>) => void;
}) {
	return (
		<>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label htmlFor={`${fId}-name`}>الاسم</Label>
					<Input
						id={`${fId}-name`}
						value={form.name}
						onChange={(e) => patch({ name: e.target.value })}
						placeholder="كابتشينو"
						className="h-11 rounded-md mt-1.5"
					/>
				</div>
				<div>
					<Label htmlFor={`${fId}-name-ar`}>الاسم بالإنجليزية</Label>
					<Input
						id={`${fId}-name-ar`}
						value={form.nameAr}
						onChange={(e) => patch({ nameAr: e.target.value })}
						placeholder="اختياري — بالإنجليزية"
						className="h-11 rounded-md mt-1.5 text-start"
						dir="ltr"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label htmlFor={`${fId}-desc`}>الوصف</Label>
					<Textarea
						id={`${fId}-desc`}
						value={form.description}
						onChange={(e) => patch({ description: e.target.value })}
						className="mt-1.5 rounded-md"
						rows={2}
					/>
				</div>
				<div>
					<Label htmlFor={`${fId}-desc-ar`}>الوصف بالإنجليزية</Label>
					<Textarea
						id={`${fId}-desc-ar`}
						value={form.descriptionAr}
						onChange={(e) => patch({ descriptionAr: e.target.value })}
						className="mt-1.5 rounded-md text-start"
						rows={2}
						dir="ltr"
					/>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<div>
					<Label htmlFor={`${fId}-price`}>السعر (د.ل)</Label>
					<Input
						id={`${fId}-price`}
						type="number"
						value={form.price || ''}
						onChange={(e) => patch({ price: Number(e.target.value) })}
						className="h-11 rounded-md mt-1.5"
						min="0"
						step="0.5"
					/>
				</div>
				<div>
					<Label htmlFor={`${fId}-disc-price`}>سعر الخصم</Label>
					<Input
						id={`${fId}-disc-price`}
						type="number"
						value={form.discountedPrice}
						onChange={(e) => patch({ discountedPrice: e.target.value })}
						className="h-11 rounded-md mt-1.5"
						min="0"
						step="0.5"
						placeholder="اختياري"
					/>
				</div>
			</div>
			<div>
				<span id={`${fId}-status`} className="text-sm font-medium leading-none block">
					الحالة
				</span>
				<div className="flex gap-2 mt-1.5">
					{['available', 'unavailable'].map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => patch({ status: s })}
							className={cn(
								'flex-1 py-2.5 rounded-md text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
								form.status === s
									? s === 'available'
										? 'bg-success/10 border-success/30 text-success'
										: 'bg-destructive/10 border-destructive/30 text-destructive'
									: 'border-border/30 hover:border-orange/30'
							)}
						>
							{s === 'available' ? 'متوفر' : 'غير متوفر'}
						</button>
					))}
				</div>
			</div>
		</>
	);
}
