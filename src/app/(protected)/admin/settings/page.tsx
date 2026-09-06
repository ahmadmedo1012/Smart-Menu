"use client"
import { getErrorMessage } from '@/lib/get-error-message';

import { csrfFetch } from "@/lib/csrf-client";
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { premiumToast } from "@/lib/premium-toast"
import {
  Store, Phone, Mail, Image,
  Settings, User,
} from "lucide-react"
import { ConfigEditor } from "@/components/admin/ConfigEditor"
import { cn } from "@/lib/utils"
import AnimatedMapPin from "@/components/ui/map-pin-icon"
import AnimatedClock from "@/components/ui/clock-icon"
import AnimatedSave from "@/components/ui/save-icon"
import { OptimizedImage } from "@/components/ui/OptimizedImage"
import { LoadingAnnouncer } from "@/components/ui/loading-announcer"
import { useAccessGate, allowRolesOrPermission } from '@/hooks/useAccessGate';
import { AccessDenied } from '@/components/shared/AccessDenied';
// round89-E5: shared row type (was a local copy)
import type { Restaurant } from '@/lib/restaurant-types';

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
  const access = useAccessGate(allowRolesOrPermission(['super_admin', 'admin'], 'EDIT_SETTINGS'));
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
        phone: selected.phone ?? "", whatsapp: selected.whatsapp ?? "",
        email: selected.email ?? "", address: selected.address ?? "",
        workingHours: selected.workingHours ?? "", logo: selected.logo,
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
    } catch (e) {
      premiumToast("error", getErrorMessage(e, "فشل حفظ الملف الشخصي"))
    } finally { setProfileSaving(false) }
  }

    if (access === 'denied') return <AccessDenied />

  if (loading) return (
    <div className="space-y-4 animate-fade-in" aria-live="polite">
      <LoadingAnnouncer loading message="جارٍ تحميل الإعدادات..." />
      {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-md bg-muted/50 animate-breath" />)}
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-bold tracking-normal">الإعدادات</h1>

      {/* Tab navigation */}
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "snap-start shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60",
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
          <h2 className="text-lg font-semibold">إعدادات المطاعم</h2>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {restaurants.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={cn(
                "snap-start shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60",
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
                  <Label htmlFor="rs-address" className="flex items-center gap-1"><AnimatedMapPin className="size-3" aria-hidden="true" /> العنوان</Label>
                  <Input id="rs-address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="h-11 rounded-xl mt-1.5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rs-hours" className="flex items-center gap-1"><AnimatedClock className="size-3" aria-hidden="true" /> ساعات العمل</Label>
                  <Input id="rs-hours" value={form.workingHours} onChange={e => setForm({...form, workingHours: e.target.value})} className="h-11 rounded-xl mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="rs-logo" className="flex items-center gap-1"><Image className="size-3" aria-hidden="true" /> رابط الشعار</Label>
                  <Input id="rs-logo" value={form.logo} onChange={e => setForm({...form, logo: e.target.value})} className="h-11 rounded-xl mt-1.5 text-left" dir="ltr" placeholder="https://..." />
                </div>
              </div>
              {form.logo && (
                <div className="size-20 rounded-xl overflow-hidden border">
                  {/* round88-A2: box is size-20 (80px) */}
                  <OptimizedImage src={form.logo} alt="شعار المطعم" className="size-full" sizes="80px" />
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button onClick={saveRestaurant} disabled={saving} className="gap-1">
                  <AnimatedSave className="size-4" aria-hidden="true" />
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
          <h2 className="text-lg font-semibold">الملف الشخصي</h2>
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
                    <h3 className="font-bold text-lg">{profile.name}</h3>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pb-4 border-b border-border/20">
                  <div>
                    <span className="text-sm font-medium leading-none block">اسم المستخدم</span>
                    <p className="text-sm text-muted-foreground mt-1">{profile.username}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium leading-none block">الصلاحية</span>
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
                <AnimatedSave className="size-4" aria-hidden="true" />
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
            <h2 className="text-lg font-semibold">إعدادات النظام</h2>
          </div>
          <ConfigEditor />
        </section>
      )}
    </div>
  )
}
