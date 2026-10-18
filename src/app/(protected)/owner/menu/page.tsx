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
import { toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { computeMoveWrites, moveItemInList } from '@/lib/menu-reorder';
import { type Category, type Item, CATEGORY_ICONS } from './types';
import { CategoriesList } from './CategoriesList';
import { CategoryDialog } from './CategoryDialog';

/* W6-B6 (G-2): ثوابت تحميل الأصناف — انظر التعليق أعلى fetchItems. */
const ITEMS_PAGE_SIZE = 100; // سقف parsePagination لمسار items
const ITEMS_LOAD_CAP = 500; // 5 طلبات متتالية — حد الترتيب الصادق

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
        /* W6-B6 (G-2 — تدقيق W6-A3): حالة الترتيب والتحديد الجماعي. */
        const [movingCatId, setMovingCatId] = useState<number | null>(null);
        const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
        const [bulk, setBulk] = useState<{ status: 'available' | 'unavailable'; done: number; total: number } | null>(null);
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

        /* W6-B6 (G-2): تحميل كل أصناف القسم — القائمة الكاملة شرط عقد الترتيب
           (التطبيع على قائمة مقصوصة كان سيفسد ترتيب الصفوف غير المحمّلة). الحد
           100/صفحة هو سقف parsePagination للمسار؛ سقف 500 صادق (5 طلبات) يغطي
           كل خطة واقعية (أساسية 50 · بريميوم 100) — القسم الأضخم منه يُعلَّم
           itemsTruncated وتُعطّل أزرار النقل بصراحة بدل ترتيب كاذب. الأثر
           الجانبي الصادق: المحرر كان يعرض أول 50 فقط بلا ترقيم — الآن يعرض
           الكل حتى السقف. */
        const fetchItems = useCallback(async (catId: number) => {
                try {
                        const all: Item[] = [];
                        let total = Number.POSITIVE_INFINITY;
                        for (let page = 1; all.length < ITEMS_LOAD_CAP; page++) {
                                const r = await fetch(
                                        `/api/items?categoryId=${catId}&page=${page}&pageSize=${ITEMS_PAGE_SIZE}`
                                );
                                if (!r.ok) throw Error(`${r.status}`);
                                const j = await r.json();
                                const rows: Item[] = Array.isArray(j.data ?? j) ? (j.data ?? j) : [];
                                total = j?.meta?.total ?? rows.length;
                                all.push(...rows);
                                if (rows.length < ITEMS_PAGE_SIZE || all.length >= total) break;
                        }
                        const truncated = all.length < total;
                        setCategories((p) =>
                                p.map((c) => (c.id === catId ? { ...c, items: all, itemsTruncated: truncated } : c))
                        );
                } catch {
                        premiumToast('error', 'تعذّر تحميل الأصناف');
                }
        }, []);

        const toggleCat = (id: number) => {
                setExpandedCat((p) => (p === id ? null : id));
                if (expandedCat !== id) {
                        // التحديد مقيد بالقسم المفتوح — تبديل القسم يبدأ صفحة نظيفة
                        setSelectedItemIds(new Set());
                        fetchItems(id);
                }
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
                } finally {
                        // W6-B6: صنف محذوف لا يبقى في التحديد الجماعي
                        setSelectedItemIds((prev) => {
                                if (!prev.has(deleteTarget.id)) return prev;
                                const next = new Set(prev);
                                next.delete(deleteTarget.id);
                                return next;
                        });
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

        /* ── W6-B6 (G-2): نقل صنف خانة واحدة (فوق/تحت) ────────────────────────
           متفائل: القائمة تتحرك فورًا، ثم تُكتب الفروق فقط (PUTs فردية —
           عقد menu-reorder). أي فشل يعيد المزامنة من الخادم (مصدر الحقيقة)
           ويعرض رسالته العربية كما هي — لا تراجع يدوي قد يفشل بدوره. */
        const moveItem = async (item: Item, dir: 'up' | 'down') => {
                if (movingCatId || bulk) return;
                const cat = categories.find((c) => c.items?.some((i) => i.id === item.id));
                if (!cat || !cat.items) return;
                const nextItems = moveItemInList(cat.items, item.id, dir);
                if (!nextItems) return; // الأول فوق / الأخير تحت
                const writes = computeMoveWrites(cat.items, item.id, dir);
                if (writes.length === 0) return;
                setMovingCatId(cat.id);
                setCategories((p) => p.map((c) => (c.id === cat.id ? { ...c, items: nextItems } : c)));
                try {
                        for (const w of writes) {
                                await csrfJson(`/api/items/${w.id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ sortOrder: w.sortOrder }),
                                });
                        }
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر تحديث الترتيب'));
                        if (expandedCat) fetchItems(expandedCat);
                } finally {
                        setMovingCatId(null);
                }
        };

        /* ── W6-B6 (G-2): الإخفاء/الإظهار الجماعي — تسلسل صادق بلا endpoint
           batch (حد البعثة): PUT واحد لكل صنف، تقدم مرئي، إيقاف عند أول فشل
           مع عدّاد «تم X من Y» ورسالة الخادم كما هي، ثم مزامنة من الخادم.
           محدّد items PUT (round91-F-B) يحدّ الدفعة عند 20 كتابة/دقيقة —
           نقف بصدق عند الحد ونخبر المالك بالباقي. */
        const applyBulkStatus = async (status: 'available' | 'unavailable') => {
                if (bulk || movingCatId) return;
                const catId = expandedCat;
                if (!catId) return;
                const ids = [...selectedItemIds];
                if (ids.length === 0) return;
                setBulk({ status, done: 0, total: ids.length });
                let done = 0;
                let failure: string | null = null;
                for (const id of ids) {
                        try {
                                await csrfJson(`/api/items/${id}`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ status }),
                                });
                                done++;
                                setBulk({ status, done, total: ids.length });
                                // مرئية صفًا صفًا: الشطب يظهر مع كل صنف يكتمل
                                setCategories((p) =>
                                        p.map((c) =>
                                                c.id === catId
                                                        ? { ...c, items: c.items?.map((i) => (i.id === id ? { ...i, status } : i)) }
                                                        : c
                                        )
                                );
                        } catch (e) {
                                failure = getErrorMessage(e, 'تعذّر التحديث');
                                break;
                        }
                }
                setBulk(null);
                setSelectedItemIds(new Set());
                if (failure) {
                        premiumToast(
                                'error',
                                `تم تحديث ${toArabicNumber(done)} من ${toArabicNumber(ids.length)}`,
                                failure
                        );
                        fetchItems(catId); // مزامنة الحقيقة بعد الإيقاف
                } else {
                        premiumToast(
                                'save',
                                status === 'unavailable'
                                        ? `تم إخفاء ${toArabicNumber(ids.length)} ${getArabicPlural(ids.length, 'صنف', 'صنفان', 'أصناف')}`
                                        : `تم إظهار ${toArabicNumber(ids.length)} ${getArabicPlural(ids.length, 'صنف', 'صنفان', 'أصناف')}`
                        );
                }
        };

        const toggleSelectItem = (id: number) => {
                setSelectedItemIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                });
        };

        const selectItemsWhere = (catId: number, predicate: (i: Item) => boolean) => {
                const cat = categories.find((c) => c.id === catId);
                const ids = cat?.items?.filter(predicate).map((i) => i.id) ?? [];
                setSelectedItemIds(new Set(ids));
        };

        // تبديل المطعم يبدأ تحديدًا نظيفًا (التحديد مقيد بالقسم المفتوح)
        useEffect(() => {
                setSelectedItemIds(new Set());
        }, [restaurantId]);

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
                                selectedItemIds={selectedItemIds}
                                bulk={bulk}
                                movingCatId={movingCatId}
                                onToggleSelectItem={toggleSelectItem}
                                onSelectAvailable={(catId) =>
                                        selectItemsWhere(catId, (i) => i.status === 'available')
                                }
                                onSelectAll={(catId) => selectItemsWhere(catId, () => true)}
                                onClearSelection={() => setSelectedItemIds(new Set())}
                                onBulkStatus={applyBulkStatus}
                                onMoveItem={moveItem}
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
