"use client"

import { csrfFetch } from "@/lib/csrf-client";
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { premiumToast } from "@/lib/premium-toast"
import {
  Save, Store, Phone, Mail, MapPin, Clock, Image,
  Bot, Eye, EyeOff, Send, MessageSquare,
  UserPlus, Store as StoreIcon, AlertTriangle, Settings,
  User, Bell, Copy, ExternalLink,
} from "lucide-react"
import ConfigEditor from "@/components/admin/ConfigEditor"
import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/components/ui/OptimizedImage"

interface Restaurant {
  id: number; name: string; slug: string; description: string
  phone: string; whatsapp: string; email: string; address: string
  workingHours: string; logo: string; planId: number | null
}

interface TelegramConfig {
  id?: number
  botToken: string
  chatId: string
  events: string[]
  isActive: boolean
}

interface AdminProfile {
  name: string
  username: string
  role: string
  email: string
  phone: string
  telegramLinked: boolean
  telegramUsername: string | null
}

interface NotifPrefs {
  telegramNotifyOrders: boolean
  telegramNotifyPayments: boolean
  telegramNotifySettings: boolean
}

const EVENT_OPTIONS = [
  { value: "user_signup", label: "اشتراك مستخدم جديد", icon: UserPlus },
  { value: "restaurant_created", label: "إنشاء مطعم", icon: StoreIcon },
  { value: "system_alert", label: "تنبيه النظام", icon: AlertTriangle },
]

const SETTINGS_TABS = [
  { id: "restaurants", label: "المطاعم", icon: Store },
  { id: "telegram", label: "تليجرام", icon: Bot },
  { id: "profile", label: "الملف الشخصي", icon: User },
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "config", label: "إعدادات النظام", icon: Settings },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير عام",
  admin: "مشرف",
  owner: "مالك",
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("restaurants")
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: "", description: "", phone: "", whatsapp: "", email: "",
    address: "", workingHours: "", logo: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Telegram config
  const [tgConfig, setTgConfig] = useState<TelegramConfig>({
    botToken: "", chatId: "", events: [], isActive: false,
  })
  const [tgSaving, setTgSaving] = useState(false)
  const [tgTesting, setTgTesting] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // Profile
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profilePhone, setProfilePhone] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)

  // Telegram linking
  const [linkUrl, setLinkUrl] = useState<string | null>(null)
  const [linkCountdown, setLinkCountdown] = useState(0)
  const [linking, setLinking] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    telegramNotifyOrders: false,
    telegramNotifyPayments: false,
    telegramNotifySettings: false,
  })
  const [notifSaving, setNotifSaving] = useState(false)

  const selected = restaurants.find(r => r.id === selectedId)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetch("/api/restaurants").then(r => r.json()),
      fetch("/api/telegram/config").then(r => r.json()),
      fetch("/api/admin/profile").then(r => r.json()),
      fetch("/api/admin/notification-preferences").then(r => r.json()),
    ])
      .then(([restData, tgData, profileData, notifData]) => {
        const list = restData.data?.restaurants ?? restData.data ?? []
        setRestaurants(list)
        if (list.length > 0) setSelectedId(list[0].id)
        if (tgData.data?.botToken !== undefined) {
          setTgConfig({
            botToken: tgData.data.botToken ?? "",
            chatId: tgData.data.chatId ?? "",
            events: tgData.data.events ?? [],
            isActive: tgData.data.isActive ?? false,
          })
        }
        if (profileData.data) {
          setProfile(profileData.data)
          setProfileName(profileData.data.name ?? "")
          setProfileEmail(profileData.data.email ?? "")
          setProfilePhone(profileData.data.phone ?? "")
        }
        if (notifData.data) {
          setNotifPrefs({
            telegramNotifyOrders: notifData.data.telegramNotifyOrders ?? false,
            telegramNotifyPayments: notifData.data.telegramNotifyPayments ?? false,
            telegramNotifySettings: notifData.data.telegramNotifySettings ?? false,
          })
        }
      })
      .catch(() => premiumToast("error", "فشل تحميل البيانات"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selected) {
      setForm({
        name: selected.name, description: selected.description,
        phone: selected.phone, whatsapp: selected.whatsapp,
        email: selected.email, address: selected.address,
        workingHours: selected.workingHours, logo: selected.logo,
      })
    }
  }, [selected])

  const saveRestaurant = async () => {
    if (!selectedId || !form.name.trim()) {
      premiumToast("error", "يرجى اختيار مطعم وإدخال الاسم"); return
    }
    setSaving(true)
    try {
      const res = await csrfFetch(`/api/restaurants/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw Error()
      premiumToast("save", "تم حفظ إعدادات المطعم")
      const r = await fetch("/api/restaurants")
      const d = await r.json()
      setRestaurants(d.data?.restaurants ?? d.data ?? [])
    } catch { premiumToast("error", "فشل الحفظ") }
    finally { setSaving(false) }
  }

  const saveTelegram = async () => {
    if (!tgConfig.botToken.trim() || !tgConfig.chatId.trim()) {
      premiumToast("error", "يرجى إدخال رمز البوت ومعرف المحادثة"); return
    }
    setTgSaving(true)
    try {
      const res = await csrfFetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tgConfig),
      })
      if (!res.ok) throw Error()
      premiumToast("save", "تم حفظ إعدادات تليجرام")
    } catch { premiumToast("error", "فشل حفظ إعدادات تليجرام") }
    finally { setTgSaving(false) }
  }

  const testTelegram = async () => {
    setTgTesting(true)
    try {
      const res = await csrfFetch("/api/telegram/test", { method: "POST" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل الإرسال")
      premiumToast("success", "تم إرسال رسالة الاختبار بنجاح!")
    } catch (e: any) {
      premiumToast("error", e.message || "فشل إرسال رسالة الاختبار")
    } finally {
      setTgTesting(false)
    }
  }

  const toggleEvent = (event: string) => {
    setTgConfig(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }))
  }

  // --- Profile handlers ---

  const saveProfile = async () => {
    const body: Record<string, string> = {}
    if (profileName !== profile?.name) body.name = profileName
    if (profileEmail !== profile?.email) body.email = profileEmail
    if (profilePhone !== profile?.phone) body.phone = profilePhone
    if (currentPassword && newPassword) {
      body.currentPassword = currentPassword
      body.newPassword = newPassword
    }
    if (Object.keys(body).length === 0) {
      premiumToast("error", "لا توجد تغييرات للحفظ"); return
    }
    setProfileSaving(true)
    try {
      const res = await csrfFetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "فشل الحفظ")
      }
      premiumToast("save", "تم حفظ الملف الشخصي")
      setCurrentPassword(""); setNewPassword("")
      const p = await fetch("/api/admin/profile")
      const pj = await p.json()
      if (pj.data) { setProfile(pj.data); setProfileName(pj.data.name); setProfileEmail(pj.data.email ?? ""); setProfilePhone(pj.data.phone ?? "") }
    } catch (e: any) {
      premiumToast("error", e.message || "فشل حفظ الملف الشخصي")
    } finally { setProfileSaving(false) }
  }

  // --- Telegram linking handlers ---

  const startLinking = async () => {
    setLinking(true)
    try {
      const res = await csrfFetch("/api/admin/telegram/link", { method: "POST" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setLinkUrl(json.data.url)
      setLinkCountdown(300)

      countdownRef.current = setInterval(() => {
        setLinkCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            if (pollRef.current) clearInterval(pollRef.current)
            premiumToast("error", "انتهت صلاحية رابط الربط")
            return 0
          }
          return prev - 1
        })
      }, 1000)

      pollRef.current = setInterval(async () => {
        try {
          const pRes = await fetch("/api/admin/profile")
          const pJson = await pRes.json()
          if (pJson.data?.telegramLinked) {
            setProfile(pJson.data)
            setLinkUrl(null); setLinkCountdown(0)
            if (pollRef.current) clearInterval(pollRef.current)
            if (countdownRef.current) clearInterval(countdownRef.current)
            premiumToast("success", "تم ربط حساب تليجرام بنجاح!")
          }
        } catch { /* ignore */ }
      }, 3000)
    } catch (e: any) {
      premiumToast("error", e.message || "فشل بدء الربط")
    } finally { setLinking(false) }
  }

  const cancelLinking = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    setLinkUrl(null); setLinkCountdown(0)
  }

  const copyLinkUrl = () => {
    if (linkUrl) navigator.clipboard.writeText(linkUrl)
    premiumToast("success", "تم نسخ الرابط")
  }

  // --- Notification prefs handler ---

  const saveNotifPrefs = async () => {
    setNotifSaving(true)
    try {
      const res = await csrfFetch("/api/admin/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifPrefs),
      })
      if (!res.ok) throw Error()
      premiumToast("save", "تم حفظ إعدادات الإشعارات")
    } catch { premiumToast("error", "فشل حفظ الإعدادات") }
    finally { setNotifSaving(false) }
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in" aria-live="polite">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-bold tracking-tight">الإعدادات</h2>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "snap-start shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all flex items-center gap-2",
                activeTab === tab.id
                  ? "bg-orange-muted border-orange/30 text-orange/80 dark:text-orange"
                  : "border-border/30 hover:border-orange/20"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* === Restaurant Settings === */}
      {activeTab === "restaurants" && <section>
        <div className="flex items-center gap-2 mb-4">
          <Store className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">إعدادات المطاعم</h3>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {restaurants.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={cn(
                "snap-start shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                selectedId === r.id
                  ? "bg-orange-muted border-orange/30 text-orange/80 dark:text-orange"
                  : "border-border/30 hover:border-orange/20"
              )}
            >
              <Store className="size-4 inline ml-1.5" aria-hidden="true" />
              {r.name}
            </button>
          ))}
        </div>

        {selected ? (
          <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center" aria-hidden="true">
                  <Store className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground">/{selected.slug}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <Label htmlFor="rs-name">الاسم</Label>
                <Input id="rs-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-11 rounded-xl mt-1.5" />
              </div>
              <div>
                <Label htmlFor="rs-desc">الوصف</Label>
                <Textarea id="rs-desc" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1.5 rounded-xl" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rs-phone" className="flex items-center gap-1"><Phone className="size-3" aria-hidden="true" /> الهاتف</Label>
                  <Input id="rs-phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
                </div>
                <div>
                  <Label htmlFor="rs-whatsapp" className="flex items-center gap-1"><Phone className="size-3" aria-hidden="true" /> واتساب</Label>
                  <Input id="rs-whatsapp" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rs-email" className="flex items-center gap-1"><Mail className="size-3" aria-hidden="true" /> البريد</Label>
                  <Input id="rs-email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
                </div>
                <div>
                  <Label htmlFor="rs-address" className="flex items-center gap-1"><MapPin className="size-3" aria-hidden="true" /> العنوان</Label>
                  <Input id="rs-address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="h-11 rounded-xl mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rs-hours" className="flex items-center gap-1"><Clock className="size-3" aria-hidden="true" /> ساعات العمل</Label>
                  <Input id="rs-hours" value={form.workingHours} onChange={e => setForm({...form, workingHours: e.target.value})} className="h-11 rounded-xl mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="rs-logo" className="flex items-center gap-1"><Image className="size-3" aria-hidden="true" /> رابط الشعار</Label>
                  <Input id="rs-logo" value={form.logo} onChange={e => setForm({...form, logo: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" placeholder="https://..." />
                </div>
              </div>
              {form.logo && (
                <div className="size-20 rounded-xl overflow-hidden border">
                  <OptimizedImage src={form.logo} alt="شعار المطعم" className="size-full" />
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button onClick={saveRestaurant} disabled={saving} className="gap-1">
                  <Save className="size-4" aria-hidden="true" />
                  {saving ? "جارٍ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3 rounded-md bg-card/50 border border-border/30">
            <Store className="size-10 text-muted-foreground/50" />
            <p>لا توجد مطاعم</p>
          </div>
        ) : null}
      </section>}

      {/* === Telegram Settings === */}
      {activeTab === "telegram" && <section>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">إعدادات تليجرام</h3>
          <Badge variant={tgConfig.isActive ? "default" : "secondary"} className="mr-auto">
            {tgConfig.isActive ? "نشط" : "غير نشط"}
          </Badge>
        </div>

        {/* Personal Telegram linking */}
        <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden mb-6">
          <div className="p-5 space-y-4">
            <h4 className="font-semibold">ربط حساب المسؤول</h4>
            {profile?.telegramLinked ? (
              <div className="flex items-center gap-2">
                <Badge variant="default">مرتبط</Badge>
                <span className="text-sm">
                  {profile.telegramUsername ? `@${profile.telegramUsername}` : "حساب تليجرام"}
                </span>
              </div>
            ) : linkUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  افتح الرابط التالي في تليجرام لربط حسابك. ينتهي الصلاحية بعد {Math.floor(linkCountdown / 60)}:{String(linkCountdown % 60).padStart(2, '0')}
                </p>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
                  <span className="text-sm text-left ltr flex-1 truncate" dir="ltr">{linkUrl}</span>
                  <button
                    type="button"
                    onClick={copyLinkUrl}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="نسخ الرابط"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="orange" className="w-full gap-2">
                      <ExternalLink className="size-4" />
                      فتح في تليجرام
                    </Button>
                  </a>
                  <Button variant="ghost" onClick={cancelLinking}>إلغاء</Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  اربط حساب تليجرام الخاص بك لتلقي إشعارات النظام
                </p>
                <Button onClick={startLinking} disabled={linking} className="gap-2">
                  <Bot className="size-4" />
                  {linking ? "جارٍ..." : "ربط تليجرام"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Bot config */}
        <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="tg-active" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
                تفعيل إشعارات تليجرام
              </Label>
              <Switch
                id="tg-active"
                checked={tgConfig.isActive}
                onCheckedChange={(v) => setTgConfig(prev => ({ ...prev, isActive: v }))}
              />
            </div>

            <div>
              <Label htmlFor="tg-bot-token">رمز البوت (Bot Token)</Label>
              <div className="relative mt-1.5">
                <Input
                  id="tg-bot-token"
                  type={showToken ? "text" : "password"}
                  value={tgConfig.botToken}
                  onChange={e => setTgConfig(prev => ({ ...prev, botToken: e.target.value }))}
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
                  {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                احصل على الرمز من <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">@BotFather</a>
              </p>
            </div>

            <div>
              <Label htmlFor="tg-chat-id">معرف المحادثة (Chat ID)</Label>
              <Input
                id="tg-chat-id"
                value={tgConfig.chatId}
                onChange={e => setTgConfig(prev => ({ ...prev, chatId: e.target.value }))}
                placeholder="-1001234567890"
                className="h-11 rounded-xl mt-1.5 text-left" dir="ltr"
              />
            </div>

            <div>
              <Label className="block mb-2">الأحداث المرسلة</Label>
              <div className="space-y-2">
                {EVENT_OPTIONS.map(ev => {
                  const Icon = ev.icon
                  const enabled = tgConfig.events.includes(ev.value)
                  return (
                    <label
                      key={ev.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        enabled
                          ? "border-orange/30 bg-orange-muted/30 dark:bg-orange-muted"
                          : "border-border/30 hover:border-orange/20"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => toggleEvent(ev.value)}
                        className="rounded border-border"
                      />
                      <Icon className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className="text-sm">{ev.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={saveTelegram} disabled={tgSaving} className="gap-1">
                <Save className="size-4" aria-hidden="true" />
                {tgSaving ? "جارٍ..." : "حفظ الإعدادات"}
              </Button>
              <Button
                variant="outline"
                onClick={testTelegram}
                disabled={tgTesting || !tgConfig.botToken.trim() || !tgConfig.chatId.trim()}
                className="gap-1"
              >
                <Send className="size-4" aria-hidden="true" />
                {tgTesting ? "جارٍ..." : "اختبار الإرسال"}
              </Button>
            </div>
          </div>
        </div>
      </section>}

      {/* === Profile === */}
      {activeTab === "profile" && <section>
        <div className="flex items-center gap-2 mb-4">
          <User className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">الملف الشخصي</h3>
        </div>

        <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
          <div className="p-5 space-y-4">
            {profile && (
              <>
                <div className="flex items-center gap-4 pb-4 border-b border-border/20">
                  <div className="size-12 rounded-full bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center text-lg font-bold text-primary">
                    {profile.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{profile.name}</h4>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-border/20">
                  <div>
                    <Label>اسم المستخدم</Label>
                    <p className="text-sm text-muted-foreground mt-1">{profile.username}</p>
                  </div>
                  <div>
                    <Label>الصلاحية</Label>
                    <p className="text-sm text-muted-foreground mt-1">{ROLE_LABELS[profile.role] || profile.role}</p>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="p-name">الاسم</Label>
              <Input id="p-name" value={profileName} onChange={e => setProfileName(e.target.value)} className="h-11 rounded-xl mt-1.5" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-email" className="flex items-center gap-1"><Mail className="size-3" aria-hidden="true" /> البريد الإلكتروني</Label>
                <Input id="p-email" type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
              <div>
                <Label htmlFor="p-phone" className="flex items-center gap-1"><Phone className="size-3" aria-hidden="true" /> رقم الهاتف</Label>
                <Input id="p-phone" type="tel" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-current-pw">كلمة المرور الحالية</Label>
                <Input id="p-current-pw" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="h-11 rounded-xl mt-1.5" />
              </div>
              <div>
                <Label htmlFor="p-new-pw">كلمة المرور الجديدة</Label>
                <Input id="p-new-pw" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-11 rounded-xl mt-1.5" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={saveProfile} disabled={profileSaving} className="gap-1">
                <Save className="size-4" aria-hidden="true" />
                {profileSaving ? "جارٍ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      </section>}

      {/* === Notifications === */}
      {activeTab === "notifications" && <section>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">إعدادات الإشعارات</h3>
        </div>

        <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
          <div className="p-5 space-y-4">
            <label className="flex items-center justify-between p-4 rounded-xl border border-border/30 cursor-pointer transition-all hover:border-orange/20">
              <div>
                <p className="font-medium">إشعارات الطلبات</p>
                <p className="text-sm text-muted-foreground mt-0.5">إرسال إشعار عند إنشاء طلب جديد</p>
              </div>
              <Switch
                checked={notifPrefs.telegramNotifyOrders}
                onCheckedChange={v => setNotifPrefs(prev => ({...prev, telegramNotifyOrders: v}))}
              />
            </label>
            <label className="flex items-center justify-between p-4 rounded-xl border border-border/30 cursor-pointer transition-all hover:border-orange/20">
              <div>
                <p className="font-medium">إشعارات المدفوعات</p>
                <p className="text-sm text-muted-foreground mt-0.5">إرسال إشعار عند حدوث عملية دفع</p>
              </div>
              <Switch
                checked={notifPrefs.telegramNotifyPayments}
                onCheckedChange={v => setNotifPrefs(prev => ({...prev, telegramNotifyPayments: v}))}
              />
            </label>
            <label className="flex items-center justify-between p-4 rounded-xl border border-border/30 cursor-pointer transition-all hover:border-orange/20">
              <div>
                <p className="font-medium">إشعارات الإعدادات</p>
                <p className="text-sm text-muted-foreground mt-0.5">إرسال إشعار عند تغيير إعدادات النظام</p>
              </div>
              <Switch
                checked={notifPrefs.telegramNotifySettings}
                onCheckedChange={v => setNotifPrefs(prev => ({...prev, telegramNotifySettings: v}))}
              />
            </label>
            <div className="flex justify-end pt-2">
              <Button onClick={saveNotifPrefs} disabled={notifSaving} className="gap-1">
                <Save className="size-4" aria-hidden="true" />
                {notifSaving ? "جارٍ..." : "حفظ الإعدادات"}
              </Button>
            </div>
          </div>
        </div>
      </section>}

      {/* === System Config === */}
      {activeTab === "config" && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="size-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">إعدادات النظام</h3>
          </div>
          <ConfigEditor />
        </section>
      )}
    </div>
  )
}
