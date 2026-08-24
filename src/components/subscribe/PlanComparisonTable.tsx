'use client';

import { MotionCheck } from '@/components/ui/motion-icons';
import { Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	capRows,
	featureMatrix,
	type ComparisonPlan,
} from './plan-comparison';

/**
 * Collapsible "قارن الباقات" section: feature column + one column per plan.
 * Mobile: horizontal scroll inside a clipped container with the first
 * (feature) column sticky — the page itself never overflows, even at 320px.
 */
export function PlanComparisonTable({
	plans,
}: {
	plans: ComparisonPlan[];
}) {
	const caps = capRows(plans);
	const features = featureMatrix(plans);

	return (
		<details className="group/compare max-w-5xl mx-auto rounded-2xl border border-border/50 bg-card open:shadow-lg open:shadow-orange/5 transition-shadow duration-300">
			<summary className="flex items-center justify-between cursor-pointer list-none select-none px-5 sm:px-6 py-4">
				<span className="font-bold text-base sm:text-lg">قارن الباقات بالتفصيل</span>
				<span
					className="size-8 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground group-open/compare:rotate-180 transition-transform duration-300"
					aria-hidden="true"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
						<path d="m6 9 6 6 6-6" />
					</svg>
				</span>
			</summary>

			<div className="px-2 sm:px-6 pb-5 sm:pb-6">
				<div className="overflow-x-auto overscroll-x-contain rounded-md border border-border/30" style={{ WebkitOverflowScrolling: 'touch' }}>
					<table className="w-full min-w-[560px] border-collapse text-sm">
						{/* Header row — plan names; first column sticky */}
						<thead>
							<tr>
								<th scope="col" className="sticky start-0 z-10 bg-card p-3 text-start font-medium text-muted-foreground min-w-[130px] border-b border-border/30">
									الميزة
								</th>
								{plans.map((p) => (
									<th key={p.id} scope="col" className="p-3 text-center font-bold whitespace-nowrap border-b border-border/30 min-w-[90px]">
										{p.nameAr}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{/* Quantitative caps */}
							{caps.map((row) => (
								<tr key={row.label} className="border-b border-border/20 last:border-0">
									<th scope="row" className="sticky start-0 z-10 bg-card p-3 text-start font-medium text-muted-foreground">
										{row.label}
									</th>
									{row.values.map((v, i) => (
										<td key={i} className="p-3 text-center font-semibold whitespace-nowrap">
											{v}
										</td>
									))}
								</tr>
							))}
							{/* Qualitative feature matrix ✓ / — */}
							{features.map((row) => (
								<tr key={row.key} className="border-b border-border/20 last:border-0">
									<th scope="row" className="sticky start-0 z-10 bg-card p-3 text-start font-medium text-muted-foreground">
										{row.label}
									</th>
									{row.values.map((has, i) => (
										<td key={i} className="p-3 text-center">
											<span className="inline-flex items-center justify-center" aria-label={has ? 'متوفر' : 'غير متوفر'}>
												{has ? (
													<MotionCheck className={cn('size-4 text-orange')} />
												) : (
													<Minus className="size-4 text-muted-foreground/40" aria-hidden="true" />
												)}
											</span>
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="mt-3 text-xs text-muted-foreground">
					اسحب أفورياً لمشاهدة جميع الباقات على الشاشات الصغيرة
				</p>
			</div>
		</details>
	);
}
