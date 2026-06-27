"use client"

import { csrfFetch } from "@/lib/csrf-client";

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Save, Store, Phone, Mail, MapPin, Clock, Image,
  Bot, Eye, EyeOff, Send, MessageSquare,
  UserPlus, Store as StoreIcon, AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

const EVENT_OPTIONS = [
  { value: "user_signup", label: "اشتراك مستخدم جديد", icon: UserPlus },
  { value: "restaurant_created", label: "إنشاء مطعم", icon: StoreIcon },
  { value: "system_alert", label: "تنبيه النظام", icon: AlertTriangle },
]

export default function AdminSettingsPage() {
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

  const selected = restaurants.find(r => r.id === selectedId)

  useEffect(() => {
    Promise.all([
      fetch("/api/restaurants").then(r => r.json()),
      fetch("/api/telegram/config").then(r => r.json()),
    ])
      .then(([restData, tgData]) => {
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
      })
      .catch(() => toast.error("فشل تحميل البيانات"))
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
      toast.error("يرجى اختيار مطعم وإدخال الاسم"); return
    }
    setSaving(true)
    try {
      const res = await csrfFetch(`/api/restaurants/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw Error()
      toast.success("تم حفظ إعدادات المطعم")
      const r = await fetch("/api/restaurants")
      const d = await r.json()
      setRestaurants(d.data?.restaurants ?? d.data ?? [])
    } catch { toast.error("فشل الحفظ") }
    finally { setSaving(false) }
  }

  const saveTelegram = async () => {
    if (!tgConfig.botToken.trim() || !tgConfig.chatId.trim()) {
      toast.error("يرجى إدخال رمز البوت ومعرف المحادثة"); return
    }
    setTgSaving(true)
    try {
      const res = await csrfFetch("/api/telegram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tgConfig),
      })
      if (!res.ok) throw Error()
      toast.success("تم حفظ إعدادات تليجرام")
    } catch { toast.error("فشل حفظ إعدادات تليجرام") }
    finally { setTgSaving(false) }
  }

  const testTelegram = async () => {
    setTgTesting(true)
    try {
      const res = await csrfFetch("/api/telegram/test", { method: "POST" })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "فشل الإرسال")
      toast.success("تم إرسال رسالة الاختبار بنجاح!")
    } catch (e: any) {
      toast.error(e.message || "فشل إرسال رسالة الاختبار")
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

  if (loading) return (
    <div className="space-y-4 animate-fade-in" aria-live="polite">
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-breath" />)}
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <h2 className="text-2xl font-bold tracking-tight">الإعدادات</h2>

      {/* === Restaurant Settings === */}
      <section>
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
          <div className="rounded-2xl bg-card/50 border border-border/30 overflow-hidden">
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
                  <img src={form.logo} alt="شعار المطعم" className="size-full object-cover" loading="lazy" />
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button onClick={saveRestaurant} disabled={saving} className="rounded-xl gap-1">
                  <Save className="size-4" aria-hidden="true" />
                  {saving ? "جارٍ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3 rounded-2xl bg-card/50 border border-border/30">
            <Store className="size-10 text-muted-foreground/50" />
            <p>لا توجد مطاعم</p>
          </div>
        ) : null}
      </section>

      {/* === Telegram Config === */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">إعدادات تليجرام</h3>
          <Badge variant={tgConfig.isActive ? "default" : "secondary"} className="mr-auto">
            {tgConfig.isActive ? "نشط" : "غير نشط"}
          </Badge>
        </div>

        <div className="rounded-2xl bg-card/50 border border-border/30 overflow-hidden">
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
              <Button onClick={saveTelegram} disabled={tgSaving} className="rounded-xl gap-1">
                <Save className="size-4" aria-hidden="true" />
                {tgSaving ? "جارٍ..." : "حفظ الإعدادات"}
              </Button>
              <Button
                variant="outline"
                onClick={testTelegram}
                disabled={tgTesting || !tgConfig.botToken.trim() || !tgConfig.chatId.trim()}
                className="rounded-xl gap-1"
              >
                <Send className="size-4" aria-hidden="true" />
                {tgTesting ? "جارٍ..." : "اختبار الإرسال"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
