'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { premiumToast } from '@/lib/premium-toast';
import {Settings} from 'lucide-react';
import AnimatedSave from '@/components/ui/save-icon';
import AnimatedEyeOff from '@/components/ui/eye-off-icon';
import AnimatedEye from '@/components/ui/eye-icon';
import AnimatedTrash from '@/components/ui/trash-icon';
import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
        DialogDescription,
        DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { csrfJson } from '@/lib/csrf-client';
import { getErrorMessage } from '@/lib/get-error-message';

interface ConfigItem {
        id: number;
        key: string;
        value: unknown;
        category: string;
        isSecret: boolean;
        description: string;
        updatedAt: string;
}

const CATEGORIES = [
        'general',
        'features',
        'limits',
        'payments',
        'notifications',
        'balance',
        'payment_config',
        'fees',
];

const CATEGORY_LABELS: Record<string, string> = {
        general: 'عام',
        features: 'الميزات',
        limits: 'الحدود',
        payments: 'المدفوعات',
        notifications: 'الإشعارات',
        balance: 'أرقام التحويل',
        payment_config: 'إعدادات الدفع',
        fees: 'الرسوم',
};

export function ConfigEditor() {
        const [configs, setConfigs] = useState<ConfigItem[]>([]);
        const [loading, setLoading] = useState(true);
        const [activeCategory, setActiveCategory] = useState('general');
        const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
        const [editing, setEditing] = useState<Record<string, unknown>>({});
        const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

        useEffect(() => {
                const controller = new AbortController();
                loadConfig(controller.signal);
                return () => controller.abort();
        }, []);

        async function loadConfig(signal?: AbortSignal) {
                try {
                        const res = await fetch('/api/admin/config', signal ? { signal } : undefined);
                        const json = await res.json();
                        if (json.success) setConfigs(json.data);
                } catch (error) {
                        if (error instanceof DOMException && error.name === 'AbortError') return;
                        premiumToast('error', 'تعذّر تحميل الإعدادات');
                } finally {
                        setLoading(false);
                }
        }

        const filtered = configs.filter((c) => c.category === activeCategory);

        const saveConfig = async (item: ConfigItem) => {
                try {
                        // round87-C3: csrfJson throws with the server's Arabic message on rejection
                        await csrfJson('/api/admin/config', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                        key: item.key,
                                        value: editing[item.key] ?? item.value,
                                        category: item.category,
                                        isSecret: item.isSecret,
                                        description: item.description,
                                }),
                        });
                        premiumToast('save', 'تم الحفظ');
                        loadConfig();
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر الحفظ'));
                }
        };

        const deleteConfig = async (key: string) => {
                try {
                        await csrfJson(`/api/admin/config?key=${encodeURIComponent(key)}`, {
                                method: 'DELETE',
                        });
                        premiumToast('trash', 'تم الحذف');
                        setDeleteTarget(null);
                        loadConfig();
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'تعذّر الحذف'));
                }
        };

        /* W7-G (A2 audit): الأشكال ترتجف بلمعة .skeleton القانونية — نبض
           الشفافية المتقاعد (animate-breath) كان لغة تحميل ثانية. */
        if (loading) return <div className="h-32 rounded-md skeleton" />;

        return (
                <div className="space-y-4">
                        {/* Category tabs — W7-G (I-4, A2 audit): يركب بدائية
                            FilterTabs الموحّدة؛ العدّ صار حبة العدّ القانونية
                            بدل Badge خارجية (كانت المجموعة بلا اسم للقارئ
                            أيضاً — البدائية تُلزم aria-label). */}
                        <FilterTabs
                                items={CATEGORIES.map((cat) => ({
                                        value: cat,
                                        label: CATEGORY_LABELS[cat] || cat,
                                        count: configs.filter((c) => c.category === cat).length,
                                }))}
                                value={activeCategory}
                                onChange={setActiveCategory}
                                aria-label="أقسام الإعدادات"
                        />

                        {/* Config items */}
                        {filtered.length === 0 ? (
                                <EmptyState
                                        size="compact"
                                        icon={Settings}
                                        title="لا توجد إعدادات في هذا القسم"
                                />
                        ) : (
                                <div className="space-y-2">
                                        {filtered.map((item) => (
                                                <div key={item.id} className="rounded-md bg-card/50 border border-border/30 p-4">
                                                        <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                                <code className="text-sm font-mono font-bold">{item.key}</code>
                                                                                {item.isSecret && (
                                                                                        <Badge
                                                                                                variant="outline"
                                                                                                className="text-3xs px-1.5 text-accent-foreground border-orange/30"
                                                                                        >
                                                                                                سري
                                                                                        </Badge>
                                                                                )}
                                                                        </div>
                                                                        {item.description && (
                                                                                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                                                        )}
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                        <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="size-8"
                                                                                onClick={() => saveConfig(item)}
                                                                                aria-label="حفظ"
                                                                        >
                                                                                <AnimatedSave className="size-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="size-8 text-destructive"
                                                                                onClick={() => setDeleteTarget(item.key)}
                                                                                aria-label="حذف"
                                                                        >
                                                                                <AnimatedTrash className="size-3.5" />
                                                                        </Button>
                                                                </div>
                                                        </div>

                                                        <div className="mt-3">
                                                                <div className="relative">
                                                                        <Input
                                                                                type={item.isSecret && !showSecrets[item.key] ? 'password' : 'text'}
                                                                                value={String(
                                                                                        editing[item.key] ??
                                                                                                (typeof item.value === 'string'
                                                                                                        ? item.value
                                                                                                        : JSON.stringify(item.value)) ??
                                                                                                ''
                                                                                )}
                                                                                onChange={(e) =>
                                                                                        setEditing((prev) => ({ ...prev, [item.key]: e.target.value }))
                                                                                }
                                                                                className={cn('font-mono text-sm', item.isSecret && 'ps-10')}
                                                                                dir="ltr"
                                                                        />
                                                                        {item.isSecret && (
                                                                                <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                                setShowSecrets((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                                                                                        }
                                                                                        className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                                                                                >
                                                                                        {showSecrets[item.key] ? (
                                                                                                <AnimatedEyeOff className="size-4" />
                                                                                        ) : (
                                                                                                <AnimatedEye className="size-4" />
                                                                                        )}
                                                                                </button>
                                                                        )}
                                                                </div>
                                                        </div>
                                                </div>
                                        ))}
                                </div>
                        )}

                        <Dialog
                                open={deleteTarget !== null}
                                onOpenChange={(o) => {
                                        if (!o) setDeleteTarget(null);
                                }}
                        >
                                <DialogContent>
                                        <DialogHeader>
                                                <DialogTitle>تأكيد الحذف</DialogTitle>
                                                <DialogDescription>
                                                        هل أنت متأكد من حذف الإعداد <strong>{deleteTarget}</strong>؟ هذا الإجراء لا يمكن
                                                        التراجع عنه.
                                                </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                                <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                                                        إلغاء
                                                </Button>
                                                <Button
                                                        variant="destructive"
                                                        onClick={() => deleteTarget && deleteConfig(deleteTarget)}
                                                >
                                                        حذف
                                                </Button>
                                        </DialogFooter>
                                </DialogContent>
                        </Dialog>
                </div>
        );
}
