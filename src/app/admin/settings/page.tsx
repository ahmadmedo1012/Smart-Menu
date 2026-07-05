"use client"

import { csrfFetch } from "@/lib/csrf-client";
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { premiumToast } from "@/lib/premium-toast"
import {
  Save, Store, Phone, Mail, MapPin, Clock, Image,
  Settings, User, AlertTriangle,
} from "lucide-react"
import ConfigEditor from "@/components/admin/ConfigEditor"
import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/components/ui/OptimizedImage"

interface Restaurant {
  id: number; name: string; slug: string; description: string
  phone: string; whatsapp: string; email: string; address: string
  workingHours: string; logo: string; planId: number | null
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

const SETTINGS_TABS = [
  { id: "restaurants", label: "المطاعم", icon: Store },
  { id: "profile", label: "الملف الشخصي", icon: User },
  { id: "config", label: "إعدادات النظام", icon: Settings },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير عام",
  admin: "مشرف",
  owner: "مالك",
}

export default function AdminSettingsPage() {
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeTab, setActiveTab] = useState("restaurants")
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: "", description: "", phone: "", whatsapp: "", email: "",
    address: "", workingHours: "", logo: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [profileName, setProfileName] = useState("")
  const [profileEmail, setProfileEmail] = useState("")
  const [profilePhone, setProfilePhone] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)

  const selected = restaurants.find(r => r.id === selectedId)

  // Permission check on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { setAccessDenied(true); return; }
        const { role, permissions } = d.data;
        if (role !== "super_admin" && role !== "admin" && !(permissions ?? []).includes("EDIT_SETTINGS")) {
          setAccessDenied(true);
        }
      })
      .catch(() => setAccessDenied(true));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/restaurants").then(r => r.json()),
      fetch("/api/admin/profile").then(r => r.json()),
    ])
      .then(([restData, profileData]) => {
        const list = restData.data?.restaurants ?? restData.data ?? []
        setRestaurants(list)
        if (list.length > 0) setSelectedId(list[0].id)
        if (profileData.data) {
          setProfile(profileData.data)
          setProfileName(profileData.data.name ?? "")
          setProfileEmail(profileData.data.email ?? "")
          setProfilePhone(profileData.data.phone ?? "")
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

  if (accessDenied) return (
    <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
      <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
      <p className="text-sm text-muted-foreground max-w-xs">لا تملك الصلاحية للوصول إلى إعدادات النظام. يرجى التواصل مع المدير العام.</p>
    </div>
  )

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
              <Store className="size-4 inline me-1.5" aria-hidden="true" />
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
