'use client';
/*
 * item-dialog/FeaturedShowcaseSection.tsx — round94 W2-b (inspection-c §2.4):
 * JSX moved VERBATIM from ItemDialog.tsx 812–905 (Stage H round79 featured
 * control + rank + showcase badge chips). The Switch keeps the LITERAL
 * id="item-featured-switch" — team8 targets `#item-featured-switch` — it
 * must NOT be converted to an fId template. The one sanctioned id fix:
 * the broken span id at old line 854 (`id={"`${fId}-showcase-tags`"}` used
 * to print literally) is now a real template literal.
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle } from 'lucide-react';
import SparklesIcon from '@/components/ui/sparkles-icon';

export function FeaturedShowcaseSection({
	fId,
	isFeatured,
	onToggleFeatured,
	featuredRank,
	onRankChange,
	showcaseTags,
	badgeDraft,
	onBadgeDraftChange,
	onAddBadge,
	onRemoveBadge,
}: {
	fId: string;
	onToggleFeatured: (v: boolean) => void;
	featuredRank: string;
	onRankChange: (v: string) => void;
	showcaseTags: string[];
	badgeDraft: string;
	onBadgeDraftChange: (v: string) => void;
	onAddBadge: () => void;
	onRemoveBadge: (tag: string) => void;
	isFeatured: boolean;
}) {
	return (
		// Stage H (round79) — featured-showcase control
		<div className="rounded-md border border-orange/25 bg-orange/5 p-3">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-start gap-2">
					<SparklesIcon className="size-4 text-ember mt-0.5 shrink-0" aria-hidden="true" />
					<div>
						<Label htmlFor="item-featured-switch">عرض في قسم الأصناف المميزة</Label>
						<p className="text-xs text-muted-foreground mt-0.5">
							يظهر الصنف أعلى صفحة المنيو داخل العرض السينمائي (حتى 5 أصناف)
						</p>
					</div>
				</div>
				<Switch
					id="item-featured-switch"
					aria-label="تمييز الصنف في القسم السينمائي"
					checked={isFeatured}
					onCheckedChange={onToggleFeatured}
				/>
			</div>
			{isFeatured && (
				<div className="mt-3 space-y-3">
					<div className="grid grid-cols-2 gap-3">
						<div>
							<Label htmlFor={`${fId}-rank`}>ترتيب الظهور</Label>
							<Input
								id={`${fId}-rank`}
								type="number"
								min="1"
								max="5"
								value={featuredRank}
								onChange={(e) => onRankChange(e.target.value)}
								className="h-11 rounded-md mt-1.5"
								placeholder="تلقائي"
							/>
						</div>
						{/* Round83 §2.3 — multi-badge chips input (max 3).
                No pre-existing chips-input component in the codebase:
                OrderDialog chips are a static multi-SELECT (aria-pressed
                toggles), this is a free-text ADD list — different pattern,
                so it is implemented inline here. */}
						<div className="col-span-2">
							<span id={`${fId}-showcase-tags`} className="text-sm font-medium leading-none block">
								شارات العرض (حتى ٣)
							</span>
							<div className="flex gap-2 mt-1.5">
								<Input
									value={badgeDraft}
									onChange={(e) => onBadgeDraftChange(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											onAddBadge();
										}
									}}
									maxLength={40}
									className="h-11 rounded-md"
									placeholder={
										showcaseTags.length >= 3 ? 'الحد الأقصى ٣ شارات' : 'مثال: الأكثر طلبًا'
									}
									disabled={showcaseTags.length >= 3}
								/>
								<Button
									type="button"
									variant="outline"
									onClick={onAddBadge}
									disabled={showcaseTags.length >= 3 || !badgeDraft.trim()}
									className="h-11 shrink-0"
									aria-label="إضافة شارة"
								>
									إضافة
								</Button>
							</div>
							{showcaseTags.length > 0 && (
								<div className="flex flex-wrap gap-1.5 mt-2">
									{showcaseTags.map((tag) => (
										<button
											key={tag}
											type="button"
											aria-label={`إزالة الشارة ${tag}`}
											onClick={() => onRemoveBadge(tag)}
											className="inline-flex items-center gap-1.5 rounded-full border border-basil/40 bg-basil/15 px-3 py-1 text-[11px] font-medium text-basil transition-colors hover:bg-basil/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-basil/60"
										>
											{tag}
											<AlertTriangle className="size-3 rotate-12" aria-hidden="true" />
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
