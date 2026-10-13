'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { MotionPlus } from '@/components/ui/motion-icons';
import { BackButton } from '@/components/shared/BackButton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { csrfJson } from '@/lib/csrf-client';
import { PlanUsageBadge } from '@/components/owner/PlanUsageBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { MenuManagerSkeleton } from '@/components/shared/DashboardSkeletons';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
import { ItemDialog } from '@/components/owner/ItemDialog';
import { premiumToast } from '@/lib/premium-toast';
import { getErrorMessage } from '@/lib/get-error-message';
import { type Category, type Item, CATEGORY_ICONS } from './types';
import { CategoriesList } from './CategoriesList';
import { CategoryDialog } from './CategoryDialog';

export default function OwnerMenuPage() {
        const [restaurantId, setRestaurantId] = useState(0);
        const [categories, setCategories] = useState<Category[]>([]);
        const [loading, setLoading] = useState(true);
        const [expandedCat, setExpandedCat] = useState<number | null>(null);
        const [pendingToggleId, setPendingToggleId] = useState<number | null>(null);
        const [searchTerm, setSearchTerm] = useState('');
        const [catDialog, setCatDialog] = useState(false);
        const [catEditing, setCatEditing] = useState<Category | null>(null);
        const [catForm, setCatForm] = useState({ name: '', nameAr: '', icon: 'Package' });
        const [itemCatId, setItemCatId] = useState(0);
        const [itemEditing, setItemEditing] = useState<Item | null>(null);
        const [itemDialogOpen, setItemDialogOpen] = useState(false);
        const [deleteTarget, setDeleteTarget] = useState<{
                type: 'category' | 'item';
                id: number;
                name: string;
        } | null>(null);
        const [usageKey, setUsageKey] = useState(0);
        const [error, setError] = useState<string | null>(null);
        const fetchCatsRef = useRef<() => Promise<void>>(undefined);
        /* r133 (A3 S2): bounded auto-retry — the old unbounded 3s loop re-fired
           the error toast and flipped skeleton↔ErrorState forever during an
           outage. Max 3 attempts with linear backoff (3s/6s/9s), then a
           dead-end ErrorState whose retry button is the manual path. */
        const RETRY_MAX = 3;
        const retryCountRef = useRef(0);

        const fetchCats = useCallback(async () => {
                if (!restaurantId) return;
                try {
                        setLoading(true);
                        setError(null);
                        const r = await fetch(`/api/categories?restaurantId=${restaurantId}`);
                        if (!r.ok) throw Error(`${r.status}`);
                        const j = await r.json();
                        const cats = j.events ?? j.data ?? j;
                        setCategories(Array.isArray(cats) ? cats : []);
                        retryCountRef.current = 0; // success ends the cycle
                } catch {
                        setError('تعذّر تحميل التصنيفات');
                        const attempt = retryCountRef.current + 1;
                        retryCountRef.current = attempt;
                        if (attempt <= RETRY_MAX) {
                                setTimeout(() => {
                                        if (restaurantId && fetchCatsRef.current) fetchCatsRef.current();
                                }, 3000 * attempt);
                        } else {
                                // terminal: one toast for the whole cycle (was one per 3s)
                                premiumToast('error', 'تعذّر تحميل التصنيفات');
                        }
                } finally {
                        setLoading(false);
                }
        }, [restaurantId]);
        useEffect(() => {
                fetchCatsRef.current = fetchCats;
        }, [fetchCats]);

        // round86-C4: shared active-restaurant hook (this page previously hand-rolled
        // it WITHOUT the switch event subscription — switching restaurants from the
        // switcher left the editor on the OLD restaurant until reload)
        const { activeId } = useActiveRestaurant();
        useEffect(() => {
                if (activeId) setRestaurantId(activeId);
        }, [activeId]);

        useEffect(() => {
                if (restaurantId) {
                        retryCountRef.current = 0; // fresh cycle per restaurant
                        fetchCats();
                }
        }, [restaurantId, fetchCats]);

        const fetchItems = useCallback(async (catId: number) => {
                try {
                        const r = await fetch(`/api/items?categoryId=${catId}`);
                        const j = await r.json();
                        setCategories((p) =>
                                p.map((c) =>
                                        c.id === catId ? { ...c, items: Array.isArray(j.data ?? j) ? (j.data ?? j) : [] } : c
                                )
                        );
                } catch {
                        premiumToast('error', 'تعذّر تحميل الأصناف');
                }
        }, []);

        const toggleCat = (id: number) => {
                setExpandedCat((p) => (p === id ? null : id));
                if (expandedCat !== id) fetchItems(id);
        };

        const saveCat = async () => {
                if (!catForm.name.trim()) {
                        premiumToast('error', 'يرجى إدخال الاسم');
                        return;
                }
                try {
                        const body = {
                                name: catForm.name.trim(),
                                nameAr: catForm.nameAr.trim() || undefined,
                                icon: catForm.icon.trim(),
                                restaurantId,
                        };
                        if (catEditing)
                                await csrfJson(`/api/categories/${catEditing.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body),
                                });
                        else
                                await csrfJson('/api/categories', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body),
                                });
                        premiumToast('save', catEditing ? 'تم التحديث' : 'تمت الإضافة');
                        setCatDialog(false);
                        fetchCats();
                        setUsageKey((k) => k + 1);
                } catch (e) {
                        /* r121-P-5 (M-ErrSurface): csrfJson يرمي رسالة الخادم العربية
                           (مثل 403 «اشتراكك منتهي. جدّد اشتراكك للمتابعة.» وسقف الباقة)
                           — كان المصدر يبتلعها خلف «تعذّر الحفظ» العامة، على نفس الصفحة
                           التي يعرض فيها use-item-save الرسالة الصريحة. */
                        premiumToast('error', getErrorMessage(e, 'تعذّر الحفظ'));
                }
        };

        const delTarget = async () => {
                if (!deleteTarget) return;
                try {
                        await csrfJson(
                                `/api/${deleteTarget.type === 'category' ? 'categories' : 'items'}/${deleteTarget.id}`,
                                { method: 'DELETE' }
                        );
                        premiumToast('trash', 'تم الحذف');
                        setDeleteTarget(null);
                        if (deleteTarget.type === 'category') fetchCats();
                        else if (expandedCat) fetchItems(expandedCat);
                        setUsageKey((k) => k + 1);
                } catch {
                        premiumToast('error', 'تعذّر الحذف');
                }
        };

        const toggleStatus = async (item: Item) => {
                if (pendingToggleId === item.id) return; // in-flight — prevent double-toggle race
                const ns = item.status === 'available' ? 'unavailable' : 'available';
                setPendingToggleId(item.id);
                try {
                        await csrfJson(`/api/items/${item.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: ns }),
                        });
                        premiumToast('save', ns === 'available' ? 'متوفر' : 'غير متوفر');
                        if (expandedCat) fetchItems(expandedCat);
                } catch {
                        premiumToast('error', 'تعذّر التحديث');
                } finally {
                        setPendingToggleId(null);
                }
        };

        const filteredCategories = categories.filter((cat) => {
                if (!searchTerm) return true;
                const q = searchTerm.toLowerCase();
                // r150 §8: الطرفان مطبّعان — كان الطلب lowercase والمقارنة على
                // الاسم الخام فصارت الأسماء اللاتينية حسّاسة لحالة الأحرف.
                // العربية (nameAr) بلا حالة أحرف أصلًا — تُقارن كما هي.
                return (
                        cat.name.toLowerCase().includes(q) ||
                        cat.nameAr?.includes(q) ||
                        cat.items?.some((i) => i.name.toLowerCase().includes(q) || i.nameAr?.includes(q))
                );
        });

        // Extracted-section callbacks (round89-G3) — the same state writes the
        // old inline arrows performed, in the same order.
        const handleAddItem = (catId: number) => {
                setItemCatId(catId);
                setItemEditing(null);
                setItemDialogOpen(true);
        };
        const handleEditCategory = (cat: Category) => {
                setCatEditing(cat);
                setCatForm({ name: cat.name, nameAr: cat.nameAr || '', icon: cat.icon });
                setCatDialog(true);
        };
        const handleDeleteCategory = (cat: Category) =>
                setDeleteTarget({ type: 'category', id: cat.id, name: cat.name });
        const handleEditItem = (item: Item) => {
                setItemEditing(item);
                setItemDialogOpen(true);
        };
        const handleDeleteItem = (item: Item) =>
                setDeleteTarget({ type: 'item', id: item.id, name: item.name });
        const handleAddCategory = () => {
                setCatEditing(null);
                setCatForm({ name: '', nameAr: '', icon: 'Package' });
                setCatDialog(true);
        };

        if (loading)
                // r131-F5 (A11 SM-2): menu-manager-shaped skeleton — was bare
                // animate-breath rows.
                return <MenuManagerSkeleton />;

        if (error)
                // r131-F5 (A1 P1-12): canonical error family (56px well + dot + retry).
                // r133 (A3 S2): the manual retry button resets the bounded cycle.
                return (
                        <ErrorState
                                title={error}
                                description="تعذّر تحميل التصنيفات — تحقق من الاتصال ثم أعد المحاولة."
                                onRetry={() => {
                                        retryCountRef.current = 0;
                                        fetchCats();
                                }}
                        />
                );

        return (
                /* r131-F5 (A1 P1-7): 40px section rhythm. */
                <div className="space-y-8 animate-fade-in">
                        <BackButton href="/owner" />
                        <PageHeader
                                title="إدارة المنيو"
                                subtitle="أضف وعدل الأصناف والفئات في قائمة مطعمك"
                                actions={
                                        <Button
                                                variant="orange"
                                                onClick={() => {
                                                        setCatEditing(null);
                                                        setCatForm({
                                                                name: '',
                                                                nameAr: '',
                                                                icon: CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)],
                                                        });
                                                        setCatDialog(true);
                                                }}
                                                className="gap-2"
                                        >
                                                <MotionPlus className="size-4" /> تصنيف جديد
                                        </Button>
                                }
                        />

                        <div className="relative">
                                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ابحث في القائمة…" />
                        </div>

                        {restaurantId > 0 && <PlanUsageBadge key={usageKey} restaurantId={restaurantId} />}

                        <CategoriesList
                                categories={filteredCategories}
                                searchTerm={searchTerm}
                                expandedCatId={expandedCat}
                                pendingToggleId={pendingToggleId}
                                onToggleCategory={toggleCat}
                                onAddItem={handleAddItem}
                                onEditCategory={handleEditCategory}
                                onDeleteCategory={handleDeleteCategory}
                                onToggleItemStatus={toggleStatus}
                                onEditItem={handleEditItem}
                                onDeleteItem={handleDeleteItem}
                                onAddCategory={handleAddCategory}
                        />

                        <CategoryDialog
                                open={catDialog}
                                onOpenChange={setCatDialog}
                                editing={Boolean(catEditing)}
                                form={catForm}
                                onFormChange={setCatForm}
                                onSave={saveCat}
                        />

                        {/* Item Dialog */}
                        <ItemDialog
                                open={itemDialogOpen}
                                onOpenChange={setItemDialogOpen}
                                editing={itemEditing}
                                categoryId={itemCatId}
                                onSaved={() => {
                                        if (expandedCat) fetchItems(expandedCat);
                                        setUsageKey((k) => k + 1);
                                }}
                        />

                        {/* r133 (A3 S3): hand-rolled delete Dialog → the shared ConfirmDialog
                            (the same grammar as owner/restaurants + OrdersTable + orders/[id] —
                            one confirmation pattern per app tier, per the r131 fleet canon). */}
                        <ConfirmDialog
                                open={deleteTarget !== null}
                                onOpenChange={(o) => !o && setDeleteTarget(null)}
                                title="تأكيد الحذف"
                                description={
                                        deleteTarget
                                                ? `هل أنت متأكد من حذف «${deleteTarget.name}»؟ هذا الإجراء لا يمكن التراجع عنه.`
                                                : ''
                                }
                                confirmLabel="حذف"
                                onConfirm={() => delTarget()}
                                destructive
                        />
                </div>
        );
}
