"use client"

import { csrfFetch } from "@/lib/csrf-client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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
} from "lucide-react"

interface TelegramConfig {
  botToken: string
  chatId: string
  events: string[]
  isActive: boolean
}

interface DiagnoseResult {
  exists: boolean
  diagnostics: {
    configExists: boolean
    isActive: boolean
    botTokenPreview: string | null
    chatId: string | null
    events: string[]
  }
  telegramApiError: string | null
}

export default function AdminTelegramPage() {
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

  useEffect(() => {
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
      .catch(() => toast.error("فشل تحميل الإعدادات"))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!config.botToken.trim() || !config.chatId.trim()) {
      toast.error("يرجى إدخال رمز البوت ومعرف المحادثة")
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
      toast.success("تم حفظ إعدادات تليجرام")
    } catch (e: any) {
      toast.error(e.message || "فشل حفظ الإعدادات")
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
      toast.success("تم إرسال رسالة الاختبار بنجاح!")
    } catch (e: any) {
      toast.error(e.message || "فشل إرسال رسالة الاختبار")
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
    } catch (e: any) {
      toast.error(e.message || "فشل التشخيص")
    } finally {
      setDiagnosing(false)
    }
  }

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
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                {diagnose.diagnostics.configExists ? (
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
                {diagnose.diagnostics.isActive ? (
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
                <span className="text-sm font-mono text-muted-foreground" dir="ltr">
                  {diagnose.diagnostics.botTokenPreview ?? "—"}
                </span>
              </div>

              {/* Chat ID */}
              <div className="flex items-center justify-between">
                <span className="text-sm">معرف المحادثة</span>
                <span className="text-sm font-mono text-muted-foreground" dir="ltr">
                  {diagnose.diagnostics.chatId ?? "—"}
                </span>
              </div>

              {/* Events */}
              <div className="flex items-center justify-between">
                <span className="text-sm">الأحداث</span>
                <span className="text-sm text-muted-foreground">
                  {(diagnose.diagnostics.events ?? []).join(", ") || "—"}
                </span>
              </div>

              {/* API error */}
              {diagnose.telegramApiError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <XCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      خطأ في API تليجرام
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 break-all" dir="ltr">
                      {diagnose.telegramApiError}
                    </p>
                  </div>
                </div>
              )}

              {/* No API error */}
              {!diagnose.telegramApiError && diagnose.exists && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                  <p className="text-sm text-success">
                    اتصال API سليم — البوت يعمل بشكل صحيح
                  </p>
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
