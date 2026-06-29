"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Settings, Eye, EyeOff, Plus, Trash2, Save } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfigItem {
  id: number
  key: string
  value: unknown
  category: string
  isSecret: boolean
  description: string
  updatedAt: string
}

const CATEGORIES = ["general", "features", "limits", "payments", "notifications"]

const CATEGORY_LABELS: Record<string, string> = {
  general: "عام",
  features: "الميزات",
  limits: "الحدود",
  payments: "المدفوعات",
  notifications: "الإشعارات",
}

export default function ConfigEditor() {
  const [configs, setConfigs] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("general")
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<Record<string, unknown>>({})

  const load = async () => {
    try {
      const res = await fetch("/api/admin/config")
      const json = await res.json()
      if (json.success) setConfigs(json.data)
    } catch {
      toast.error("فشل تحميل الإعدادات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = configs.filter((c) => c.category === activeCategory)

  const saveConfig = async (item: ConfigItem) => {
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: item.key,
          value: editing[item.key] ?? item.value,
          category: item.category,
          isSecret: item.isSecret,
          description: item.description,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error()
      toast.success("تم الحفظ")
      load()
    } catch {
      toast.error("فشل الحفظ")
    }
  }

  const deleteConfig = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/config?key=${encodeURIComponent(key)}`, { method: "DELETE" })
      const json = await res.json()
      if (!json.success) throw new Error()
      toast.success("تم الحذف")
      load()
    } catch {
      toast.error("فشل الحذف")
    }
  }

  if (loading) return <div className="h-32 rounded-md bg-muted/50 animate-breath" />

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "snap-start shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
              activeCategory === cat
                ? "bg-orange-muted border-orange/30 text-orange/80 dark:text-orange"
                : "border-border/30 hover:border-orange/20"
            )}
          >
            {CATEGORY_LABELS[cat] || cat}
            <Badge variant="outline" className="mr-2 text-[10px] px-1.5">
              {configs.filter((c) => c.category === cat).length}
            </Badge>
          </button>
        ))}
      </div>

      {/* Config items */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
          <Settings className="size-10 text-muted-foreground/50" />
          <p className="text-sm">لا توجد إعدادات في هذا القسم</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-md bg-card/50 border border-border/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold">{item.key}</code>
                    {item.isSecret && (
                      <Badge variant="outline" className="text-[10px] px-1.5 text-orange border-orange/30">
                        سري
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => saveConfig(item)}>
                    <Save className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => deleteConfig(item.key)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-3">
                <div className="relative">
                  <Input
                    type={item.isSecret && !showSecrets[item.key] ? "password" : "text"}
                    value={String(editing[item.key] ?? JSON.stringify(item.value) ?? "")}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [item.key]: e.target.value }))}
                    className={cn("h-10 rounded-xl font-mono text-sm", item.isSecret && "pl-10")}
                    dir="ltr"
                  />
                  {item.isSecret && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecrets[item.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
