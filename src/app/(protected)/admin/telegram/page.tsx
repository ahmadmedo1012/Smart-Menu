'use client';
import { getErrorMessage } from '@/lib/get-error-message';

import { csrfFetch } from '@/lib/csrf-client';
import { useEffect, useState, useCallback } from 'react';
import { premiumToast } from '@/lib/premium-toast';
import { Loader2, Lightbulb } from 'lucide-react';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';
import { TelegramConfigSection } from './TelegramConfigSection';
import { BroadcastTargetsSection } from './BroadcastTargetsSection';
import { DiagnosticsSection } from './DiagnosticsSection';
import { useAccessGate, allowRolesOrPermission } from '@/hooks/useAccessGate';
import { AccessDenied } from '@/components/shared/AccessDenied';

interface TelegramConfig {
        botToken: string;
        botTokenMasked?: boolean;
        chatId: string;
        events: string[];
        isActive: boolean;
}

interface DiagnoseResult {
        configExists: boolean;
        isActive: boolean;
        hasToken: boolean;
        events: string[];
        linkedAdmins: number;
        broadcastTargets?: {
                id: number;
                label: string;
                chatId: string;
                isActive: boolean;
                ok: boolean | null;
                error: string | null;
        }[];
}

interface BroadcastTarget {
        id: number;
        label: string;
        chatId: string;
        isActive: boolean;
        createdAt: string;
}

interface Approver {
        id: number;
        telegramId: number;
        label: string;
        addedBy: { id: number; name: string; username: string } | null;
        createdAt: string;
}

export default function AdminTelegramPage() {
        // round87-C1: unified access gate (was a hand-rolled /api/auth/me check
        // inside loadAll — plus 10 drifting sibling copies across admin pages)
        const access = useAccessGate(allowRolesOrPermission(['super_admin', 'admin'], 'EDIT_SETTINGS'));
        const [config, setConfig] = useState<TelegramConfig>({
                botToken: '',
                chatId: '',
                events: [],
                isActive: false,
        });
        const [loading, setLoading] = useState(true);
        const [saving, setSaving] = useState(false);
        const [testing, setTesting] = useState(false);
        const [diagnosing, setDiagnosing] = useState(false);
        const [diagnose, setDiagnose] = useState<DiagnoseResult | null>(null);
        const [showToken, setShowToken] = useState(false);
        const [eventsInput, setEventsInput] = useState('');
        // r118-A1-F3: whether the server has a stored bot token (masked load) —
        // drives the save-side "keep stored token" semantics below.
        const [hasStoredToken, setHasStoredToken] = useState(false);
        const [targets, setTargets] = useState<BroadcastTarget[]>([]);
        const [linkedAdmins, setLinkedAdmins] = useState(0);
        const [loadError, setLoadError] = useState<string | null>(null);
        const [approvers, setApprovers] = useState<Approver[]>([]);
        const [approversLoading, setApproversLoading] = useState(true);

        const loadAll = useCallback(() => {
                setLoading(true);
                setLoadError(null);

                // round87-C1: access gate extracted to useAccessGate above.
                fetch('/api/telegram/config')
                        .then((r) => r.json())
                        .then((json) => {
                                if (json.data) {
                                        const d = json.data;
                                        setHasStoredToken(d.botTokenMasked === true);
                                        setConfig({
                                                botToken: d.botTokenMasked ? '••••••••' : '',
                                                botTokenMasked: d.botTokenMasked ?? false,
                                                chatId: d.chatId ?? '',
                                                events: d.events ?? [],
                                                isActive: d.isActive ?? false,
                                        });
                                        setEventsInput((d.events ?? []).join(', '));
                                }
                        })
                        .catch(() => premiumToast('error', 'فشل تحميل الإعدادات'))
                        .finally(() => setLoading(false));

                fetch('/api/telegram/broadcast-targets')
                        .then((r) => r.json())
                        .then((json) => {
                                if (json.success && json.data) setTargets(json.data);
                        })
                        .catch(() => setLoadError('فشل تحميل أقسام تيليجرام'));

                fetch('/api/telegram/diagnose?dryRun=true')
                        .then((r) => r.json())
                        .then((json) => {
                                if (json.success && json.data) {
                                        setLinkedAdmins(json.data.linkedAdmins ?? 0);
                                        setDiagnose(json.data);
                                }
                        })
                        .catch(() => setLoadError('فشل تشخيص تيليجرام'));

                fetch('/api/admin/telegram/approvers')
                        .then((r) => r.json())
                        .then((json) => {
                                if (json.success) setApprovers(json.data ?? []);
                        })
                        .catch(() => setLoadError('فشل تحميل الموافقين'))
                        .finally(() => setApproversLoading(false));
        }, []);

        useEffect(() => {
                loadAll();
        }, [loadAll]);

        const handleSave = async () => {
                if (!config.chatId.trim()) {
                        premiumToast('error', 'يرجى إدخال معرف المحادثة');
                        return;
                }
                // A masked load puts •••• in the field — sending it back would encrypt the
                // dots over the real token and brick the bot. Only send a token the admin
                // actually typed; otherwise omit it so the server keeps the stored one.
                // r118-A1-F3: the old `isMasked` gate was frozen at load — a
                // NEWLY typed token still read as "masked" and was replaced with
                // undefined (server silently kept the old token). Typed value wins;
                // an empty/untouched field keeps the stored token when one exists,
                // and only blocks when NO token is stored at all.
                const typedToken = config.botToken === '••••••••' ? '' : config.botToken.trim();
                if (!hasStoredToken && !typedToken) {
                        premiumToast('error', 'يرجى إدخال رمز البوت ومعرف المحادثة');
                        return;
                }
                setSaving(true);
                try {
                        const res = await csrfFetch('/api/telegram/config', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                        ...config,
                                        botToken: typedToken ? typedToken : undefined,
                                        events: eventsInput
                                                .split(',')
                                                .map((e) => e.trim())
                                                .filter(Boolean),
                                }),
                        });
                        const json = await res.json();
                        if (!json.success) throw new Error(json.error || 'فشل الحفظ');
                        premiumToast('save', 'تم حفظ إعدادات تليجرام');
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'فشل حفظ الإعدادات'));
                } finally {
                        setSaving(false);
                }
        };

        const handleTest = async () => {
                setTesting(true);
                try {
                        const res = await csrfFetch('/api/telegram/test', { method: 'POST' });
                        const json = await res.json();
                        if (!json.success) throw new Error(json.error || 'فشل الإرسال');
                        premiumToast('success', 'تم إرسال رسالة الاختبار بنجاح!');
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'فشل إرسال رسالة الاختبار'));
                } finally {
                        setTesting(false);
                }
        };

        const handleDiagnose = async () => {
                setDiagnosing(true);
                setDiagnose(null);
                try {
                        const res = await fetch('/api/telegram/diagnose');
                        const json = await res.json();
                        if (!json.success) throw new Error(json.error || 'فشل التشخيص');
                        setDiagnose(json.data);
                        setLinkedAdmins(json.data.linkedAdmins ?? 0);
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'فشل التشخيص'));
                } finally {
                        setDiagnosing(false);
                }
        };

        const handleAddTarget = async (label: string, chatId: string) => {
                try {
                        const res = await csrfFetch('/api/telegram/broadcast-targets', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ label, chatId }),
                        });
                        const json = await res.json();
                        if (!json.success) throw new Error(json.error || 'فشل الإضافة');
                        setTargets((prev) => [json.data, ...prev]);
                        premiumToast('success', 'تمت إضافة جهة الإرسال');
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'فشل إضافة جهة الإرسال'));
                }
        };

        const handleToggleTarget = async (id: number, isActive: boolean) => {
                try {
                        const res = await csrfFetch(`/api/telegram/broadcast-targets/${id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isActive }),
                        });
                        const json = await res.json();
                        if (!json.success) throw new Error(json.error || 'فشل التحديث');
                        setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, isActive } : t)));
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'فشل تحديث الحالة'));
                }
        };

        const handleDeleteTarget = async (id: number) => {
                try {
                        const res = await csrfFetch(`/api/telegram/broadcast-targets/${id}`, { method: 'DELETE' });
                        const json = await res.json();
                        if (!json.success) throw new Error(json.error || 'فشل الحذف');
                        setTargets((prev) => prev.filter((t) => t.id !== id));
                        premiumToast('success', 'تم حذف جهة الإرسال');
                } catch (e) {
                        premiumToast('error', getErrorMessage(e, 'فشل حذف جهة الإرسال'));
                }
        };

        if (access === 'denied') return <AccessDenied />

        if (loading)
                return (
                        <div className="flex items-center justify-center py-20" aria-live="polite">
                                <LoadingAnnouncer loading message="جارٍ تحميل إعدادات التليجرام..." />
                                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
                        </div>
                );

        return (
                <div className="space-y-8 animate-fade-in max-w-3xl">
                        <h1 className="text-2xl font-bold tracking-normal">إعدادات تليجرام</h1>

                        {loadError && (
                                <div
                                        role="alert"
                                        className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                                >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>{loadError} — بعض الأقسام قد تكون فارغة مؤقتاً</span>
                                                <button
                                                        type="button"
                                                        onClick={loadAll}
                                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                                                >
                                                        <AnimatedRefreshCw className="size-3.5" />
                                                        إعادة المحاولة
                                                </button>
                                        </div>
                                </div>
                        )}

                        <TelegramConfigSection
                                config={config}
                                eventsInput={eventsInput}
                                showToken={showToken}
                                saving={saving}
                                testing={testing}
                                diagnosing={diagnosing}
                                onConfigChange={setConfig}
                                onEventsChange={setEventsInput}
                                onToggleShowToken={() => setShowToken(!showToken)}
                                onSave={handleSave}
                                onTest={handleTest}
                                onDiagnose={handleDiagnose}
                        />

                        <BroadcastTargetsSection
                                targets={targets}
                                linkedAdmins={linkedAdmins}
                                onAdd={handleAddTarget}
                                onToggle={handleToggleTarget}
                                onDelete={handleDeleteTarget}
                        />

                        <DiagnosticsSection
                                diagnose={diagnose}
                                approvers={approvers}
                                approversLoading={approversLoading}
                                onApproversChange={setApprovers}
                        />

                        {/* Broadcast guide */}
                        <section>
                                <div className="rounded-md bg-muted/30 border border-border/20 p-5">
                                        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                                                <Lightbulb className="size-4 text-primary" />
                                                خطوات التفعيل
                                        </h2>
                                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                                <li>قم بإضافة البوت الخاص بالمنصة كمشرف (Admin) داخل قناتك أو مجموعتك الخاصة.</li>
                                                <li>تأكد من تفعيل صلاحية &quot;نشر الرسائل&quot; (Post Messages).</li>
                                                <li>الصق معرف القناة (تبدأ بـ -100) هنا لحفظ الإعدادات.</li>
                                        </ol>
                                </div>
                        </section>

                        {/* Help */}
                        <section>
                                <div className="rounded-md bg-muted/30 border border-border/20 p-5">
                                        <h2 className="text-sm font-semibold mb-2">كيفية الإعداد</h2>
                                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                                <li>
                                                        افتح{' '}
                                                        <a
                                                                href="https://t.me/BotFather"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="underline"
                                                        >
                                                                @BotFather
                                                        </a>{' '}
                                                        في تليجرام وأنشئ بوت جديد
                                                </li>
                                                <li>انسخ الرمز (token) والصقه في حقل رمز البوت</li>
                                                <li>
                                                        أرسل أي رسالة إلى بوتك الجديد، ثم افتح{' '}
                                                        <a
                                                                href="https://t.me/userinfobot"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="underline"
                                                        >
                                                                @userinfobot
                                                        </a>{' '}
                                                        لمعرفة معرف المحادثة
                                                </li>
                                                <li>أدخل المعرف في حقل معرف المحادثة واحفظ الإعدادات</li>
                                                <li>اضغط اختبار الإرسال للتحقق من العمل</li>
                                        </ol>
                                </div>
                        </section>
                </div>
        );
}
