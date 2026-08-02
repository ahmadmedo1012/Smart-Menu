'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Plus, ExternalLink, Star, Trash2, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { toArabicNumber } from '@/lib/format';
import { ACTIVE_RESTAURANT_KEY } from '@/components/owner/RestaurantSwitcher';

type RestaurantInfo = {
	id: number;
	name: string;
	slug: string;
	description: string;
	isPrimary: boolean;
	createdAt: string;
	_count?: { categories: number; orders: number };
};

export default function OwnerRestaurantsPage() {
	const router = useRouter();
	const [restaurants, setRestaurants] = useState<RestaurantInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAdd, setShowAdd] = useState(false);
	const [newMenu, setNewMenu] = useState({ name: '', slug: '', description: '' });
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await fetch('/api/owner/restaurants');
			const json = await res.json();
			setRestaurants(json.data ?? json ?? []);
		} catch {
			premiumToast('error', 'فشل تحميل المنيوهات');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const addMenu = async () => {
		if (!newMenu.name.trim() || !newMenu.slug.trim()) {
			premiumToast('error', 'اسم المنيو والرابط مطلوبان');
			return;
		}
		setSaving(true);
		try {
			const res = await csrfFetch('/api/owner/restaurants', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newMenu.name.trim(),
					slug: newMenu.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
					description: newMenu.description.trim(),
				}),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'فشل إضافة المنيو');
			premiumToast('success', 'تم إضافة المنيو بنجاح');
			setShowAdd(false);
			setNewMenu({ name: '', slug: '', description: '' });
			load();
		} catch (e: any) {
			premiumToast('error', e.message);
		} finally {
			setSaving(false);
		}
	};

	const setPrimary = async (id: number) => {
		try {
			const res = await csrfFetch(`/api/owner/restaurants/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isPrimary: true }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'فشل');
			premiumToast('success', 'تم تعيين المنيو كأساسي');
			localStorage.setItem(ACTIVE_RESTAURANT_KEY, String(id));
			load();
		} catch (e: any) {
			premiumToast('error', e.message);
		}
	};

	const deleteMenu = async (r: RestaurantInfo) => {
		if (!confirm(`هل تريد حذف المنيو "${r.name}"؟ سيتم حذف كل الأصناف والطلبات المرتبطة به.`)) return;
		try {
			const res = await csrfFetch(`/api/owner/restaurants/${r.id}`, { method: 'DELETE' });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'فشل الحذف');
			premiumToast('success', 'تم حذف المنيو');
			if (Number(localStorage.getItem(ACTIVE_RESTAURANT_KEY)) === r.id) {
				localStorage.removeItem(ACTIVE_RESTAURANT_KEY);
			}
			load();
		} catch (e: any) {
			premiumToast('error', e.message);
		}
	};

	const copyLink = (slug: string) => {
		navigator.clipboard.writeText(`https://menu.smart-link.ly/menu/${slug}`);
		premiumToast('copy', 'تم نسخ رابط المنيو');
	};

	if (loading)
		return (
			<div className="flex items-center justify-center py-24">
				<Loader2 className="size-6 animate-spin text-primary" />
			</div>
		);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold">المنيوهات</h1>
					<p className="text-sm text-muted-foreground mt-1">
						إدارة منيوهات مطاعمك — كل منيو له رابط خاص
					</p>
				</div>
				<Button onClick={() => setShowAdd((s) => !s)} className="h-11">
					<Plus className="size-4 ms-2" /> إضافة منيو جديد
				</Button>
			</div>

			{/* Add form */}
			{showAdd && (
				<div className="rounded-md border border-border/40 p-5 space-y-4 bg-card/50 animate-fade-in">
					<h3 className="font-bold">منيو جديد</h3>
					<div className="grid sm:grid-cols-2 gap-4">
						<div>
							<Label>اسم المطعم *</Label>
							<Input
								value={newMenu.name}
								onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })}
								placeholder="مثال: مطعم الجبل"
								className="h-11 mt-1.5"
							/>
						</div>
						<div>
							<Label>الرابط المختصر *</Label>
							<div className="flex items-center mt-1.5">
								<span className="text-xs text-muted-foreground bg-muted/50 h-11 px-3 rounded-sm border-e-0 border-input flex items-center shrink-0">
									/menu/
								</span>
								<Input
									value={newMenu.slug}
									onChange={(e) =>
										setNewMenu({
											...newMenu,
											slug: e.target.value.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
										})
									}
									placeholder="al-jabal"
									className="h-11 rounded-[4px] -me-[2px] text-left"
									dir="ltr"
								/>
							</div>
						</div>
					</div>
					<div>
						<Label>الوصف</Label>
						<Input
							value={newMenu.description}
							onChange={(e) => setNewMenu({ ...newMenu, description: e.target.value })}
							placeholder="وصف المطعم (اختياري)"
							className="h-11 mt-1.5"
						/>
					</div>
					<div className="flex gap-2 justify-end">
						<Button variant="ghost" onClick={() => setShowAdd(false)}>
							إلغاء
						</Button>
						<Button onClick={addMenu} disabled={saving} className="h-11 px-6">
							{saving ? <Loader2 className="size-4 animate-spin" /> : <Store className="size-4 ms-2" />}
							إضافة
						</Button>
					</div>
				</div>
			)}

			{/* List */}
			{restaurants.length === 0 ? (
				<div className="rounded-md border border-dashed border-border/40 p-12 text-center">
					<Store className="size-10 mx-auto text-muted-foreground/50 mb-3" />
					<p className="text-muted-foreground">لا يوجد منيوهات بعد — أضف منيو جديد</p>
				</div>
			) : (
				<div className="grid sm:grid-cols-2 gap-4">
					{restaurants.map((r) => (
						<div
							key={r.id}
							className="rounded-md border border-border/40 bg-card/60 p-5 space-y-3 hover:border-primary/30 transition-colors"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex items-center gap-3 min-w-0">
									<div className="size-10 rounded-sm bg-gradient-to-br from-orange to-orange/70 flex items-center justify-center shrink-0">
										<Store className="size-5 text-white" />
									</div>
									<div className="min-w-0">
										<h3 className="font-bold truncate">{r.name}</h3>
										<p className="text-xs text-muted-foreground truncate" dir="ltr">
											/menu/{r.slug}
										</p>
									</div>
								</div>
								{r.isPrimary && (
									<span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
										الأساسي
									</span>
								)}
							</div>

							{r.description && (
								<p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
							)}

							<div className="flex items-center gap-4 text-xs text-muted-foreground">
								<span>{toArabicNumber(r._count?.categories ?? 0)} أقسام</span>
								<span>{toArabicNumber(r._count?.orders ?? 0)} طلبات</span>
							</div>

							<div className="flex flex-wrap gap-2 pt-1">
								<Button
									variant="outline"
									size="sm"
									onClick={() => router.push(`/owner/menu?restaurantId=${r.id}`)}
								>
									إدارة المنيو
								</Button>
								<Button variant="outline" size="sm" onClick={() => copyLink(r.slug)}>
									<Copy className="size-3.5 ms-1.5" /> نسخ الرابط
								</Button>
								<Button variant="outline" size="sm" onClick={() => window.open(`/menu/${r.slug}`, '_blank')}>
									<ExternalLink className="size-3.5 ms-1.5" /> فتح
								</Button>
								{!r.isPrimary && (
									<Button variant="outline" size="sm" onClick={() => setPrimary(r.id)}>
										<Star className="size-3.5 ms-1.5" /> تعيين أساسي
									</Button>
								)}
								<Button
									variant="ghost"
									size="sm"
									className="text-destructive hover:bg-destructive/10"
									onClick={() => deleteMenu(r)}
									disabled={r.isPrimary}
									title={r.isPrimary ? 'لا يمكن حذف المنيو الأساسي' : 'حذف'}
								>
									<Trash2 className="size-3.5" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
