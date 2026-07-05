"use client"

import { csrfFetch } from "@/lib/csrf-client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { premiumToast } from "@/lib/premium-toast"
import {
  Bot,
  Save,
  Send,
  Stethoscope,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Users,
  UserCheck,
  AlertTriangle,
} from "lucide-react"

interface TelegramConfig {
  botToken: string
  chatId: string
  events: string[]
  isActive: boolean
}

interface DiagnoseResult {
  configExists: boolean
  isActive: boolean
  botTokenPreview: string | null
  events: string[]
  linkedAdmins: number
  broadcastTargets?: {
    id: number
    label: string
    chatId: string
    isActive: boolean
    ok: boolean | null
    error: string | null
  }[]
}

interface BroadcastTarget {
  id: number
  label: string
  chatId: string
  isActive: boolean
  createdAt: string
}

interface Approver {
  id: number
  telegramId: number
  label: string
  addedBy: { id: number; name: string; username: string } | null
  createdAt: string
}

function maskChatId(id: string): string {
  if (id.length <= 4) return id
  return id.slice(0, 4) + "..." + id.slice(-3)
}

export default function AdminTelegramPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: "",
    chatId: "",
    events: [],
    isActive: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnose, setDiagnose] = useState<DiagnoseResult | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [eventsInput, setEventsInput] = useState("")
  const [targets, setTargets] = useState<BroadcastTarget[]>([])
  const [newLabel, setNewLabel] = useState("")
  const [newChatId, setNewChatId] = useState("")
  const [adding, setAdding] = useState(false)
  const [linkedAdmins, setLinkedAdmins] = useState(0)

  // Approvers
  const [approvers, setApprovers] = useState<Approver[]>([])
  const [approversLoading, setApproversLoading] = useState(true)
  const [newApproverId, setNewApproverId] = useState("")
  const [newApproverLabel, setNewApproverLabel] = useState("")
  const [addingApprover, setAddingApprover] = useState(false)

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const { role, permissions } = d.data;
          if (role !== "super_admin" && role !== "admin" && !(permissions ?? []).includes("EDIT_SETTINGS")) {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        }
      })
      .catch(() => { setAccessDenied(true); setLoading(false); return; })

    fetch("/api/telegram/config")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const d = json.data
          setConfig({
            botToken: d.botToken ?? "",
            chatId: d.chatId ?? "",
            events: d.events ?? [],
            isActive: d.isActive ?? false,
          })
          setEventsInput((d.events ?? []).join(", "))
        }
      })
      .catch(() => premiumToast("error", "فشل تحميل الإعدادات"))
      .finally(() => setLoading(false))

    fetch("/api/telegram/broadcast-targets")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setTargets(json.data)
      })
      .catch(() => {})

    fetch("/api/telegram/diagnose?dryRun=true")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setLinkedAdmins(json.data.linkedAdmins ?? 0)
          setDiagnose(json.data)
        }
      })
      .catch(() => {})

    fetch("/api/admin/telegram/approvers")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setApprovers(json.data ?? [])
      })
      .catch(() => {})
      .finally(() => setApproversLoading(false))
  }, [])

  const handleSave = async () => {
    if (!config.botToken.trim() || !config.chatId.trim()) {
      premiumToast("error", "يرجى إدخال رمز البوت ومعرف المحادثة")
      return
    }
    setSaving(true)
    try {
      const res = await csrfFetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          events: eventsInput
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل الحفظ")
      premiumToast("save", "تم حفظ إعدادات تليجرام")
    } catch (e: any) {
      premiumToast("error", e.message || "فشل حفظ الإعدادات")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await csrfFetch("/api/telegram/test", { method: "POST" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل الإرسال")
      premiumToast("success", "تم إرسال رسالة الاختبار بنجاح!")
    } catch (e: any) {
      premiumToast("error", e.message || "فشل إرسال رسالة الاختبار")
    } finally {
      setTesting(false)
    }
  }

  const handleDiagnose = async () => {
    setDiagnosing(true)
    setDiagnose(null)
    try {
      const res = await fetch("/api/telegram/diagnose")
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل التشخيص")
      setDiagnose(json.data)
      setLinkedAdmins(json.data.linkedAdmins ?? 0)
    } catch (e: any) {
      premiumToast("error", e.message || "فشل التشخيص")
    } finally {
      setDiagnosing(false)
    }
  }

  const handleAddTarget = async () => {
    if (!newChatId.trim()) {
      premiumToast("error", "يرجى إدخال معرف المحادثة")
      return
    }
    setAdding(true)
    try {
      const res = await csrfFetch("/api/telegram/broadcast-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel.trim(),
          chatId: newChatId.trim(),
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل الإضافة")
      setTargets((prev) => [json.data, ...prev])
      setNewLabel("")
      setNewChatId("")
      premiumToast("success", "تمت إضافة جهة الإرسال")
    } catch (e: any) {
      premiumToast("error", e.message || "فشل إضافة جهة الإرسال")
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      const res = await csrfFetch(
        `/api/telegram/broadcast-targets/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        },
      )
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل التحديث")
      setTargets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive } : t)),
      )
    } catch (e: any) {
      premiumToast("error", e.message || "فشل تحديث الحالة")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await csrfFetch(
        `/api/telegram/broadcast-targets/${id}`,
        { method: "DELETE" },
      )
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل الحذف")
      setTargets((prev) => prev.filter((t) => t.id !== id))
      premiumToast("success", "تم حذف جهة الإرسال")
    } catch (e: any) {
      premiumToast("error", e.message || "فشل حذف جهة الإرسال")
    }
  }

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
      <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
      <p className="text-sm text-muted-foreground max-w-xs">لا تملك الصلاحية للوصول إلى إعدادات التليجرام. يرجى التواصل مع المدير العام.</p>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" aria-live="polite">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-bold tracking-tight">إعدادات تليجرام</h2>

      {/* ─── Config Form ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">إعدادات البوت</h3>
          <Badge
            variant={config.isActive ? "default" : "secondary"}
            className="mr-auto"
          >
            {config.isActive ? "نشط" : "غير نشط"}
          </Badge>
        </div>

        <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Active toggle */}
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="tg-active"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Bot className="size-4 text-muted-foreground" aria-hidden="true" />
                تفعيل إشعارات تليجرام
              </Label>
              <Switch
                id="tg-active"
                checked={config.isActive}
                onCheckedChange={(v) =>
                  setConfig((prev) => ({ ...prev, isActive: v }))
                }
              />
            </div>

            {/* Bot Token */}
            <div>
              <Label htmlFor="tg-bot-token">رمز البوت (Bot Token)</Label>
              <div className="relative mt-1.5">
                <Input
                  id="tg-bot-token"
                  type={showToken ? "text" : "password"}
                  value={config.botToken}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, botToken: e.target.value }))
                  }
                  placeholder="123456789:ABCdefGHIjklmNOPqrstUVwxyz"
                  className="h-11 rounded-xl text-left ltr pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showToken ? "إخفاء الرمز" : "إظهار الرمز"}
                >
                  {showToken ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                احصل على الرمز من{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  @BotFather
                </a>
              </p>
            </div>

            {/* Chat ID */}
            <div>
              <Label htmlFor="tg-chat-id">معرف المحادثة (Chat ID)</Label>
              <Input
                id="tg-chat-id"
                value={config.chatId}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, chatId: e.target.value }))
                }
                placeholder="-1001234567890"
                className="h-11 rounded-xl mt-1.5 text-left"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                أرسل <span className="font-mono" dir="ltr">/start</span> إلى{" "}
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  @userinfobot
                </a>{" "}
                لمعرفة المعرف
              </p>
            </div>

            {/* Events */}
            <div>
              <Label htmlFor="tg-events">
                الأحداث المرسلة (مفصولة بفاصلة)
              </Label>
              <Input
                id="tg-events"
                value={eventsInput}
                onChange={(e) => setEventsInput(e.target.value)}
                placeholder="user_signup, restaurant_created, system_alert"
                className="h-11 rounded-xl mt-1.5 text-left"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                أمثلة: user_signup, restaurant_created, system_alert
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl gap-1"
              >
                <Save className="size-4" aria-hidden="true" />
                {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !config.botToken.trim() || !config.chatId.trim()}
                className="rounded-xl gap-1"
              >
                {testing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-4" aria-hidden="true" />
                )}
                {testing ? "جارٍ..." : "اختبار الإرسال"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDiagnose}
                disabled={diagnosing}
                className="rounded-xl gap-1"
              >
                {diagnosing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Stethoscope className="size-4" aria-hidden="true" />
                )}
                {diagnosing ? "جارٍ..." : "تشخيص"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Broadcast Targets ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Send className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            جهات الإرسال (Broadcast Targets)
          </h3>
        </div>

        <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Add form */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="tg-new-label">تسمية</Label>
                <Input
                  id="tg-new-label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="مثال: قناة الإشعارات"
                  className="h-11 rounded-xl mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="tg-new-chatid">معرف المحادثة</Label>
                <Input
                  id="tg-new-chatid"
                  value={newChatId}
                  onChange={(e) => setNewChatId(e.target.value)}
                  placeholder="-100xxxx"
                  className="h-11 rounded-xl mt-1.5 text-left"
                  dir="ltr"
                />
              </div>
              <Button
                onClick={handleAddTarget}
                disabled={adding || !newChatId.trim()}
                className="rounded-xl gap-1 shrink-0"
              >
                {adding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                إضافة
              </Button>
            </div>

            {/* Targets list */}
            {targets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد جهات إرسال مضافة
              </p>
            ) : (
              <div className="space-y-2">
                {targets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.label || t.chatId}
                      </p>
                      <p
                        className="text-xs font-mono text-muted-foreground"
                        dir="ltr"
                      >
                        {maskChatId(t.chatId)}
                      </p>
                    </div>
                    <Switch
                      checked={t.isActive}
                      onCheckedChange={(v) => handleToggle(t.id, v)}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(t.id)}
                      className="rounded-xl"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Linked admins */}
            <p className="text-sm text-muted-foreground">
              <Users className="size-4 inline-block align-text-bottom ml-1" />
              عدد المشرفين المرتبطين: {linkedAdmins}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Approvers (Subscription Approvers) ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            الموافقون على الاشتراكات
          </h3>
        </div>

        <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
          <div className="p-5 space-y-4">
            <p className="text-sm text-muted-foreground">
              أضف معرفات تليجرام لأشخاص إضافيين يمكنهم الموافقة أو رفض طلبات الاشتراك عبر البوت
            </p>

            {/* Add form */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="appr-telegram-id">معرف تليجرام (User ID)</Label>
                <Input
                  id="appr-telegram-id"
                  type="number"
                  value={newApproverId}
                  onChange={(e) => setNewApproverId(e.target.value)}
                  placeholder="123456789"
                  className="h-11 rounded-xl mt-1.5 text-left"
                  dir="ltr"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="appr-label">تسمية</Label>
                <Input
                  id="appr-label"
                  value={newApproverLabel}
                  onChange={(e) => setNewApproverLabel(e.target.value)}
                  placeholder="مثال: أحمد"
                  className="h-11 rounded-xl mt-1.5"
                />
              </div>
              <Button
                onClick={async () => {
                  if (!newApproverId.trim()) {
                    premiumToast("error", "يرجى إدخال معرف تليجرام")
                    return
                  }
                  setAddingApprover(true)
                  try {
                    const res = await csrfFetch("/api/admin/telegram/approvers", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        telegramId: Number(newApproverId),
                        label: newApproverLabel.trim(),
                      }),
                    })
                    const json = await res.json()
                    if (!json.success) throw new Error(json.error || "فشل الإضافة")
                    setApprovers((prev) => [json.data, ...prev])
                    setNewApproverId("")
                    setNewApproverLabel("")
                    premiumToast("success", "تمت إضافة الموافق")
                  } catch (e: any) {
                    premiumToast("error", e.message || "فشل إضافة الموافق")
                  } finally {
                    setAddingApprover(false)
                  }
                }}
                disabled={addingApprover || !newApproverId.trim()}
                className="rounded-xl gap-1 shrink-0"
              >
                {addingApprover ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                إضافة
              </Button>
            </div>

            {/* Approvers list */}
            {approversLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : approvers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا يوجد موافقون مضافة
              </p>
            ) : (
              <div className="space-y-2">
                {approvers.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/20"
                  >
                    <UserCheck className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {a.label || `ID: ${a.telegramId}`}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground" dir="ltr">
                        {a.telegramId}
                        {a.addedBy && (
                          <span className="text-muted-foreground/60">
                            {" "}· أضيف بواسطة {a.addedBy.name}
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await csrfFetch(`/api/admin/telegram/approvers/${a.id}`, { method: "DELETE" })
                          const json = await res.json()
                          if (!json.success) throw new Error(json.error || "فشل الحذف")
                          setApprovers((prev) => prev.filter((x) => x.id !== a.id))
                          premiumToast("success", "تم حذف الموافق")
                        } catch (e: any) {
                          premiumToast("error", e.message || "فشل حذف الموافق")
                        }
                      }}
                      className="rounded-xl"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Broadcast Guide ─── */}
      <section>
        <div className="rounded-md bg-muted/30 border border-border/20 p-5">
          <h3 className="text-sm font-semibold mb-2">
            💡 خطوات التفعيل
          </h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              قم بإضافة البوت الخاص بالمنصة كمشرف (Admin) داخل قناتك أو
              مجموعتك الخاصة.
            </li>
            <li>
              تأكد من تفعيل صلاحية &quot;نشر الرسائل&quot; (Post Messages).
            </li>
            <li>
              الصق معرف القناة (تبدأ بـ -100) هنا لحفظ الإعدادات.
            </li>
          </ol>
        </div>
      </section>

      {/* ─── Diagnose Results ─── */}
      {diagnose && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="size-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">نتيجة التشخيص</h3>
          </div>

          <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
            <div className="p-5 space-y-3">
              {/* Config exists */}
              <div className="flex items-center justify-between">
                <span className="text-sm">الإعدادات موجودة</span>
                {diagnose.configExists ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="size-3" /> نعم
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="size-3" /> لا
                  </Badge>
                )}
              </div>

              {/* Is active */}
              <div className="flex items-center justify-between">
                <span className="text-sm">البوت نشط</span>
                {diagnose.isActive ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="size-3" /> نعم
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="size-3" /> لا
                  </Badge>
                )}
              </div>

              {/* Bot token preview */}
              <div className="flex items-center justify-between">
                <span className="text-sm">رمز البوت</span>
                <span
                  className="text-sm font-mono text-muted-foreground"
                  dir="ltr"
                >
                  {diagnose.botTokenPreview ?? "—"}
                </span>
              </div>

              {/* Events */}
              <div className="flex items-center justify-between">
                <span className="text-sm">الأحداث</span>
                <span className="text-sm text-muted-foreground">
                  {(diagnose.events ?? []).join(", ") || "—"}
                </span>
              </div>

              {/* Config exists → healthy */}
              {diagnose.configExists && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                  <p className="text-sm text-success">
                    اتصال API سليم — البوت يعمل بشكل صحيح
                  </p>
                </div>
              )}

              {/* Per-target broadcast results */}
              {diagnose.broadcastTargets && diagnose.broadcastTargets.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">نتائج جهات الإرسال</h4>
                  <div className="space-y-2">
                    {diagnose.broadcastTargets.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/20">
                        <span className="text-sm truncate">{t.label || t.chatId}</span>
                        {t.ok === true && <Badge variant="default">✅</Badge>}
                        {t.ok === false && <Badge variant="destructive">❌ {t.error}</Badge>}
                        {t.ok === null && <Badge variant="secondary">⏳ لم يُختبر</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── Help ─── */}
      <section>
        <div className="rounded-md bg-muted/30 border border-border/20 p-5">
          <h3 className="text-sm font-semibold mb-2">كيفية الإعداد</h3>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              افتح{" "}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                @BotFather
              </a>{" "}
              في تليجرام وأنشئ بوت جديد
            </li>
            <li>انسخ الرمز (token) والصقه في حقل رمز البوت</li>
            <li>
              أرسل أي رسالة إلى بوتك الجديد، ثم افتح{" "}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                @userinfobot
              </a>{" "}
              لمعرفة معرف المحادثة
            </li>
            <li>أدخل المعرف في حقل معرف المحادثة واحفظ الإعدادات</li>
            <li>اضغط اختبار الإرسال للتحقق من العمل</li>
          </ol>
        </div>
      </section>
    </div>
  )
}
