'use client';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { Pencil, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { MotionChevronDown } from '@/components/ui/motion-icons';
import { MotionPlus } from '@/components/ui/motion-icons';
import AnimatedTrash from '@/components/ui/trash-icon';
import SparklesIcon from '@/components/ui/sparkles-icon';
import { cn } from '@/lib/utils';
import { toArabicNumber, formatPrice } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';
import { type Category, type Item, CATEGORY_ICON_MAP } from './types';

/** عائلة التحديد الجماعي — الحالة في الصفحة (المصدر الوحيد)، والأزرار هنا. */
interface BulkState {
        status: 'available' | 'unavailable';
        done: number;
        total: number;
}

interface CategoriesListProps {
        /** Filtered categories to render (search applied by the page). */
        categories: Category[];
        searchTerm: string;
        expandedCatId: number | null;
        pendingToggleId: number | null;
        onToggleCategory: (id: number) => void;
        onAddItem: (catId: number) => void;
        onEditCategory: (cat: Category) => void;
        onDeleteCategory: (cat: Category) => void;
        onToggleItemStatus: (item: Item) => void;
        onEditItem: (item: Item) => void;
        onDeleteItem: (item: Item) => void;
        onAddCategory: () => void;
        /* W6-B6 (G-2) — الترتيب + الإخفاء/الإظهار الجماعي */
        selectedItemIds: Set<number>;
        bulk: BulkState | null;
        movingCatId: number | null;
        onToggleSelectItem: (id: number) => void;
        onSelectAvailable: (catId: number) => void;
        onSelectAll: (catId: number) => void;
        onClearSelection: () => void;
        onBulkStatus: (status: 'available' | 'unavailable') => void;
        onMoveItem: (item: Item, dir: 'up' | 'down') => void;
}

/** Category cards with their item rows — verbatim extraction from the owner
 * menu page (round89-G3). All row actions are callbacks: the page performs
 * the same state writes the old inline arrows did, in the same order. */
export function CategoriesList({
        categories,
        searchTerm,
        expandedCatId,
        pendingToggleId,
        onToggleCategory,
        onAddItem,
        onEditCategory,
        onDeleteCategory,
        onToggleItemStatus,
        onEditItem,
        onDeleteItem,
        onAddCategory,
        selectedItemIds,
        bulk,
        movingCatId,
        onToggleSelectItem,
        onSelectAvailable,
        onSelectAll,
        onClearSelection,
        onBulkStatus,
        onMoveItem,
}: CategoriesListProps) {
        return (
                /* r131-F5 (A1 P0-3): the hand-rolled 80px gradient-tile empty state
                        joins the shared EmptyState primitive. */
                categories.length === 0 ? (
                        <EmptyState
                                icon={Package}
                                title={searchTerm ? 'لا توجد نتائج' : 'لا توجد تصنيفات'}
                                description={searchTerm ? 'جرب كلمات بحث أخرى' : 'أضف تصنيفاً جديداً لبدء بناء المنيو'}
                                action={
                                        !searchTerm ? (
                                                <Button
                                                        variant="orange"
                                                        size="sm"
                                                        onClick={() => onAddCategory()}
                                                        className="gap-2"
                                                >
                                                        <MotionPlus className="size-4" /> إضافة تصنيف
                                                </Button>
                                        ) : undefined
                                }
                        />
                ) : (
                        <div className="space-y-3">
                                {categories.map((cat) => {
                                        /* W6-B6 (G-2): حالة أزرار النقل — البحث يفلتر القائمة
                                           (نقل داخل نتيجة مفلترة غامض)، والقص عند سقف
                                           التحميل يجعل التطبيع كاذبًا (عقد menu-reorder). */
                                        const movesBlocked = Boolean(searchTerm) || Boolean(cat.itemsTruncated);
                                        const movesBlockedReason = searchTerm
                                                ? 'الترتيب متاح بعد مسح البحث — القائمة المعروضة مفلترة'
                                                : 'القسم يتجاوز سقف 500 صنف — الترتيب غير متاح هنا';
                                        const items = cat.items ?? [];
                                        const selectedCount = items.filter((i) => selectedItemIds.has(i.id)).length;
                                        const bulkBusy = bulk !== null;
                                        return (
                                        <div
                                                key={cat.id}
                                                className="rounded-lg border border-border/30 bg-card/50 overflow-hidden transition-[border-color,box-shadow] hover:border-orange/30 hover:shadow-md focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/60"
                                        >
                                                {/* r150 §8 (a11y): التوسيع صار قابلًا للتشغيل بلوحة المفاتيح —
                                                    role="button" + Enter/Space بدل <button> حقيقية لأن ترويسة
                                                    البطاقة تحوي أزرار إضافة/تعديل/حذف داخلية (لا يجوز تداخل
                                                    <button> داخل <button>؛ الحلقة focus-within على البطاقة
                                                    تمنح حلقة التركيز المرئية). */}
                                                <div className="flex items-center justify-between px-5 py-4 hover:bg-muted/20">
                                                        {/* P13-2b (wave-4 axe): r150's div[role=button] header NESTED the
                                                            action <Button>s — axe nested-interactive (serious). The
                                                            disclosure pattern splits: the name cluster IS the trigger
                                                            (role=button, no interactive descendants); the actions row
                                                            are siblings, never children. Keyboard expansion keeps
                                                            Enter/Space; the card's focus-within ring is unchanged. */}
                                                        <div
                                                                className="flex items-center gap-3 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 min-h-11"
                                                                onClick={() => onToggleCategory(cat.id)}
                                                                role="button"
                                                                tabIndex={0}
                                                                aria-expanded={expandedCatId === cat.id}
                                                                onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                                e.preventDefault();
                                                                                onToggleCategory(cat.id);
                                                                        }
                                                                }}
                                                        >
                                                        <div className="flex items-center gap-3">
                                                                {cat.icon && cat.icon in CATEGORY_ICON_MAP ? (
                                                                        (() => {
                                                                                const I = CATEGORY_ICON_MAP[cat.icon];
                                                                                return <I className="size-6 text-primary" />;
                                                                        })()
                                                                ) : (
                                                                        // r97-X2 [7]: lucide fallback replaces the raw emoji —
                                                                        // unmapped/legacy icon strings render as a proper icon.
                                                                        <Package className="size-6 text-muted-foreground" />
                                                                )}
                                                                <div>
                                                                        <span className="font-heading font-bold">{cat.name}</span>
                                                                        {cat.nameAr && (
                                                                                <span className="text-xs text-muted-foreground ms-2">{cat.nameAr}</span>
                                                                        )}
                                                                        <span className="text-xs text-muted-foreground ms-2 bg-muted/50 px-2 py-0.5 rounded-full">
                                                                                {toArabicNumber(cat._count?.items ?? cat.items?.length ?? 0)} صنف
                                                                        </span>
                                                                </div>
                                                        </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                                <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onAddItem(cat.id);
                                                                        }}
                                                                        title="إضافة صنف"
                                                                                                                                                aria-label="إضافة صنف"
                                                                                                                                        >
                                                                                                                                                <MotionPlus className="size-4" />
                                                                                                                                                <span className="sr-only sm:not-sr-only sm:inline">إضافة صنف</span>
                                                                                                                                        </Button>
                                                                <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onEditCategory(cat);
                                                                        }}
                                                                        title="تعديل"
                                                                        aria-label="تعديل"
                                                                >
                                                                        <Pencil className="size-4" />
                                                                </Button>
                                                                <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-10 w-10 text-destructive"
                                                                        onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onDeleteCategory(cat);
                                                                        }}
                                                                        title="حذف"
                                                                        aria-label="حذف"
                                                                >
                                                                        <AnimatedTrash className="size-4" />
                                                                </Button>
                                                                <MotionChevronDown
                                                                        className={cn(
                                                                                'size-5 text-muted-foreground transition-transform duration-base ms-1',
                                                                                expandedCatId === cat.id && 'rotate-180'
                                                                        )}
                                                                />
                                                        </div>
                                                </div>

                                                {expandedCatId === cat.id && (
                                                        <div className="border-t border-border/20">
                                                                {items.length > 0 ? (
                                                                        <>
                                                                                {/* W6-B6 (G-2): شريط الإخفاء/الإظهار الجماعي — «إخفاء
                                                                                    المتاح» لساعة الذروة = تحديد المتاح ثم إخفاء
                                                                                    المحدد. التنفيذ تسلسلي صادق (لا endpoint batch):
                                                                                    PUT لكل صنف + تقدم مرئي + إيقاف عند أول فشل
                                                                                    برسالة الخادم (صفحة المالك تفصّل العقد). */}
                                                                                <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-muted/20 border-b border-border/10">
                                                                                        <span
                                                                                                className="text-xs font-semibold text-muted-foreground tabular-nums"
                                                                                                aria-live="polite"
                                                                                        >
                                                                                                {bulk ? (
                                                                                                        <>
                                                                                                                {bulk.status === 'unavailable' ? 'جارٍ الإخفاء' : 'جارٍ الإظهار'}…{' '}
                                                                                                                {toArabicNumber(bulk.done)}/{toArabicNumber(bulk.total)}
                                                                                                        </>
                                                                                                ) : selectedCount === 0 ? (
                                                                                                        'لا أصناف محددة'
                                                                                                ) : (
                                                                                                        <>
                                                                                                                تم تحديد {toArabicNumber(selectedCount)}{' '}
                                                                                                                {getArabicPlural(selectedCount, 'صنف', 'صنفان', 'أصناف')}
                                                                                                        </>
                                                                                                )}
                                                                                        </span>
                                                                                        <div className="flex flex-wrap items-center gap-1.5 ms-auto">
                                                                                                <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => onSelectAvailable(cat.id)}
                                                                                                        disabled={bulkBusy}
                                                                                                >
                                                                                                        تحديد المتاح
                                                                                                </Button>
                                                                                                <Button
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        onClick={() => onSelectAll(cat.id)}
                                                                                                        disabled={bulkBusy}
                                                                                                >
                                                                                                        تحديد الكل
                                                                                                </Button>
                                                                                                {selectedCount > 0 && !bulkBusy && (
                                                                                                        <Button
                                                                                                                variant="ghost"
                                                                                                                size="sm"
                                                                                                                onClick={onClearSelection}
                                                                                                        >
                                                                                                                إلغاء التحديد
                                                                                                        </Button>
                                                                                                )}
                                                                                                <Button
                                                                                                        variant="outline"
                                                                                                        size="sm"
                                                                                                        onClick={() => onBulkStatus('unavailable')}
                                                                                                        disabled={selectedCount === 0 || bulkBusy}
                                                                                                        className="text-destructive hover:border-destructive/40"
                                                                                                >
                                                                                                        إخفاء المحدد
                                                                                                </Button>
                                                                                                <Button
                                                                                                        variant="outline"
                                                                                                        size="sm"
                                                                                                        onClick={() => onBulkStatus('available')}
                                                                                                        disabled={selectedCount === 0 || bulkBusy}
                                                                                                        className="text-success-ink hover:border-orange/40"
                                                                                                >
                                                                                                        إظهار المحدد
                                                                                                </Button>
                                                                                        </div>
                                                                                </div>
                                                                                <div className="divide-y divide-border/10">
                                                                                {items.map((item, index) => (
                                                                                        <div
                                                                                                key={item.id}
                                                                                                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/10 transition-colors group"
                                                                                        >
                                                                                                {/* W6-B6 (G-2): تحديد جماعي — خانة أصلية
                                                                                                    (semantics مجانية) بجميع المقاسات: الإخفاء
                                                                                                    الجماعي حاجة مطبخ من الهاتف أيضًا. */}
                                                                                                <input
                                                                                                        type="checkbox"
                                                                                                        checked={selectedItemIds.has(item.id)}
                                                                                                        onChange={() => onToggleSelectItem(item.id)}
                                                                                                        disabled={bulkBusy}
                                                                                                        aria-label={`تحديد ${item.name}`}
                                                                                                        className="size-4 shrink-0 accent-orange cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                                                                />
                                                                                                {/* W6-B6 (G-2): أزرار النقل للأعلى/للأسفل —
                                                                                                    التوأم الوصولي (لوحة المفاتيح + القارئ). المقبض
                                                                                                    الزخرفي حُذف (تدقيق W6-A3: مقبض وهم بلا
                                                                                                    معالجات أسوأ من لا مقبض). md+ فقط — خانة
                                                                                                    المقبض القديمة نفسها (حكم r121-J-3: صف
                                                                                                    ≤390px لا يتحمل عمودًا إضافيًا)؛ تحرير الجوال
                                                                                                    عبر تطبيق المالك (نطاق v1 الموثق). */}
                                                                                                <div className="hidden md:flex flex-col gap-0.5 shrink-0">
                                                                                                        <button
                                                                                                                type="button"
                                                                                                                onClick={() => onMoveItem(item, 'up')}
                                                                                                                disabled={
                                                                                                                        movesBlocked ||
                                                                                                                        movingCatId === cat.id ||
                                                                                                                        index === 0
                                                                                                                }
                                                                                                                title={movesBlocked ? movesBlockedReason : 'نقل للأعلى'}
                                                                                                                aria-label={`نقل ${item.name} للأعلى`}
                                                                                                                className="size-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                                                                                        >
                                                                                                                <ChevronUp className="size-4" aria-hidden="true" />
                                                                                                        </button>
                                                                                                        <button
                                                                                                                type="button"
                                                                                                                onClick={() => onMoveItem(item, 'down')}
                                                                                                                disabled={
                                                                                                                        movesBlocked ||
                                                                                                                        movingCatId === cat.id ||
                                                                                                                        index === items.length - 1
                                                                                                                }
                                                                                                                title={movesBlocked ? movesBlockedReason : 'نقل للأسفل'}
                                                                                                                aria-label={`نقل ${item.name} للأسفل`}
                                                                                                                className="size-7 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                                                                                                        >
                                                                                                                <ChevronDown className="size-4" aria-hidden="true" />
                                                                                                        </button>
                                                                                                </div>
                                                                                                {item.image ? (
                                                                                                        <OptimizedImage
                                                                                                                src={item.image}
                                                                                                                alt={item.name}
                                                                                                                className="size-10 rounded-md border border-border/30 shrink-0"
                                                                                                                sizes="40px"
                                                                                                                skeleton={false}
                                                                                                        />
                                                                                                ) : (
                                                                                                        <div className="size-10 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                                                                                                                <Package className="size-4 text-muted-foreground/40" />
                                                                                                        </div>
                                                                                                )}
                                                                                                <div className="flex-1 min-w-0">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                                <span
                                                                                                                        className={cn(
                                                                                                                                'font-medium text-sm',
                                                                                                                                item.status !== 'available' &&
                                                                                                                                        'text-muted-foreground/50 line-through'
                                                                                                                        )}
                                                                                                                >
                                                                                                                        {item.name}
                                                                                                                </span>
                                                                                                                {item.nameAr && (
                                                                                                                        <span className="text-xs text-muted-foreground/60 hidden sm:inline">
                                                                                                                                {item.nameAr}
                                                                                                                        </span>
                                                                                                                )}
                                                                                                                {item.isFeatured && (
                                                                                                                        <span
                                                                                                                                title="مميز — يظهر في القسم السينمائي"
                                                                                                                                className="inline-flex items-center gap-0.5 text-3xs font-bold text-ember dark:text-saffron bg-orange/10 border border-orange/25 rounded-full px-1.5 py-0.5"
                                                                                                                        >
                                                                                                                                <SparklesIcon className="size-2.5" aria-hidden="true" />
                                                                                                                        </span>
                                                                                                                )}
                                                                                                        </div>
                                                                                                        {item.description && (
                                                                                                                <p className="text-xs text-muted-foreground/50 truncate max-w-md">
                                                                                                                        {item.description}
                                                                                                                </p>
                                                                                                        )}
                                                                                                </div>
                                                                                                {/* Phase 6 (r154): قائد النقاط — سعر الصنف
                                                                                                    على طراز المنيو المطبوع (md+ حيث يتنفس
                                                                                                    الصف؛ الجوال يبقى مضغوطًا). */}
                                                                                                <i className="menu-leader-rule hidden md:block" aria-hidden="true" />
                                                                                                <div className="text-end shrink-0 tabular-nums whitespace-nowrap">
                                                                                                        <span
                                                                                                                className={cn(
                                                                                                                        'font-bold text-sm tabular-nums',
                                                                                                                        item.discountedPrice && 'text-destructive'
                                                                                                                )}
                                                                                                        >
                                                                                                                {/* r121-H-1: smart formatPrice default (r120 contract) —
                                                                                                                    was forced decimals:1 («12.0»); suffix '' keeps the
                                                                                                                    separate د.ل span. */}
                                                                                                                {formatPrice(item.discountedPrice ?? item.price, { suffix: '' })}
                                                                                                        </span>
                                                                                                        <span className="text-xs text-muted-foreground ms-0.5">د.ل</span>
                                                                                                        {item.discountedPrice && (
                                                                                                                <span className="text-xs text-muted-foreground/50 line-through block tabular-nums">
                                                                                                                        {formatPrice(item.price, { suffix: '' })}
                                                                                                                </span>
                                                                                                        )}
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                        <Switch
                                                                                                                size="sm"
                                                                                                                checked={item.status === 'available'}
                                                                                                                disabled={pendingToggleId === item.id}
                                                                                                                onCheckedChange={() => onToggleItemStatus(item)}
                                                                                                aria-label={`تغيير حالة توفر ${item.name}`}
                                                                                                        />
                                                                                                        <span
                                                                                                                className={cn(
                                                                                                                        // r121-J-3: hidden below sm — the Switch + its
                                                                                                                        // aria-label already carry the availability state;
                                                                                                                        // the w-14 word was eating 56px of the ≤390px row.
                                                                                                                        'text-xs w-14 hidden sm:inline',
                                                                                                                        item.status === 'available' ? 'text-success-ink' : 'text-destructive'
                                                                                                                )}
                                                                                                        >
                                                                                                                {item.status === 'available' ? 'متوفر' : 'غير متوفر'}
                                                                                                        </span>
                                                                                                </div>
                                                                                                <div className="flex gap-0.5">
                                                                                                        <Button
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="h-10 w-10"
                                                                                                                onClick={() => onEditItem(item)}
                                                                                                                title="تعديل"
                                                                                                                aria-label="تعديل"
                                                                                                        >
                                                                                                                <Pencil className="size-3.5" />
                                                                                                        </Button>
                                                                                                        <Button
                                                                                                                variant="ghost"
                                                                                                                size="icon"
                                                                                                                className="h-10 w-10 text-destructive"
                                                                                                                onClick={() => onDeleteItem(item)}
                                                                                                                title="حذف"
                                                                                                                aria-label="حذف"
                                                                                                        >
                                                                                                                <AnimatedTrash className="size-3.5" />
                                                                                                        </Button>
                                                                                                </div>
                                                                                        </div>
                                                                                ))}
                                                                        </div>
                                                                        </>
                                                                ) : (
                                                                        <EmptyState
                                                                                size="compact"
                                                                                icon={Package}
                                                                                title="لا توجد أصناف في هذا التصنيف"
                                                                                action={
                                                                                        <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                onClick={() => onAddItem(cat.id)}
                                                                                                className="gap-1 border-orange/30 text-accent-foreground hover:bg-orange-muted"
                                                                                        >
                                                                                                <MotionPlus className="size-3.5" /> إضافة صنف
                                                                                        </Button>
                                                                                }
                                                                        />
                                                                )}
                                                        </div>
                                                )}
                                        </div>
                                        );
                                })}
                        </div>
                )
        );
}
