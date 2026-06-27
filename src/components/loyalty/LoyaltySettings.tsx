"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Save, Award, Gift, RefreshCw } from "lucide-react"

/* ---------- Types ---------- */

interface LoyaltySettingsData {
  loyalty_enabled: string
  loyalty_points_per_lyd: string
  loyalty_referral_discount_pct: string
  loyalty_referrer_reward_pct: string
  loyalty_referral_reward_points: string
  loyalty_referral_max_per_customer: string
  loyalty_referral_expiry_days: string
  loyalty_tier_silver: string
  loyalty_tier_gold: string
  loyalty_tier_platinum: string
}

const DEFAULTS: LoyaltySettingsData = {
  loyalty_enabled: "true",
  loyalty_points_per_lyd: "1",
  loyalty_referral_discount_pct: "10",
  loyalty_referrer_reward_pct: "10",
  loyalty_referral_reward_points: "25",
  loyalty_referral_max_per_customer: "10",
  loyalty_referral_expiry_days: "30",
  loyalty_tier_silver: "50",
  loyalty_tier_gold: "150",
  loyalty_tier_platinum: "400",
}

type Props = {
  onSaved?: () => void
}

/* ---------- Component ---------- */

export default function LoyaltySettings({ onSaved }: Props) {
  const [form, setForm] = useState<LoyaltySettingsData>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/settings")
      const json = await res.json()
      const s = json.data?.settings ?? {}
      setForm({
        loyalty_enabled: s.loyalty_enabled ?? DEFAULTS.loyalty_enabled,
        loyalty_points_per_lyd: s.loyalty_points_per_lyd ?? DEFAULTS.loyalty_points_per_lyd,
        loyalty_referral_discount_pct: s.loyalty_referral_discount_pct ?? DEFAULTS.loyalty_referral_discount_pct,
        loyalty_referrer_reward_pct: s.loyalty_referrer_reward_pct ?? DEFAULTS.loyalty_referrer_reward_pct,
        loyalty_referral_reward_points: s.loyalty_referral_reward_points ?? DEFAULTS.loyalty_referral_reward_points,
        loyalty_referral_max_per_customer: s.loyalty_referral_max_per_customer ?? DEFAULTS.loyalty_referral_max_per_customer,
        loyalty_referral_expiry_days: s.loyalty_referral_expiry_days ?? DEFAULTS.loyalty_referral_expiry_days,
        loyalty_tier_silver: s.loyalty_tier_silver ?? DEFAULTS.loyalty_tier_silver,
        loyalty_tier_gold: s.loyalty_tier_gold ?? DEFAULTS.loyalty_tier_gold,
        loyalty_tier_platinum: s.loyalty_tier_platinum ?? DEFAULTS.loyalty_tier_platinum,
      })
    } catch {
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const set = (key: keyof LoyaltySettingsData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    setSaving(true)
    try {
      const body = Object.entries(form).map(([key, value]) => ({ key, value }))
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Loyalty settings saved")
      onSaved?.()
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-64" />
      </Card>
    )
  }

  return (
    <Card className="border-white/30 bg-card/60 backdrop-blur-xl dark:bg-card dark:border-border/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="size-5 text-orange" />
            <h3 className="text-base font-semibold">Loyalty Program Settings</h3>
          </div>
          <Button onClick={save} disabled={saving} size="sm" className="gap-1.5">
            <Save className="size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable / Disable Toggle */}
        <div className="flex items-center justify-between rounded-xl bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-muted">
              <Award className="size-5 text-orange" />
            </div>
            <div>
              <p className="text-sm font-medium">Enable Loyalty Program</p>
              <p className="text-xs text-muted-foreground">Allow customers to earn points and referrals</p>
            </div>
          </div>
          <Switch
            checked={form.loyalty_enabled === "true"}
            onCheckedChange={(v) => set("loyalty_enabled", v ? "true" : "false")}
          />
        </div>

        <Separator className="bg-card/10" />

        {/* Points Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="size-4 text-muted-foreground" />
            Points &amp; Rewards
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Points per 1 LYD</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.loyalty_points_per_lyd}
                onChange={(e) => set("loyalty_points_per_lyd", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">How many points per 1 LYD spent</p>
            </div>
            <div>
              <Label>Referral Discount %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.loyalty_referral_discount_pct}
                onChange={(e) => set("loyalty_referral_discount_pct", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Discount for referred friend&apos;s first order</p>
            </div>
            <div>
              <Label>Referrer Reward %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.loyalty_referrer_reward_pct}
                onChange={(e) => set("loyalty_referrer_reward_pct", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Reward points for the referrer on conversion</p>
            </div>
          </div>
        </div>

        <Separator className="bg-card/10" />

        {/* Referral-Specific Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Gift className="size-4 text-muted-foreground" />
            Referral Settings
          </h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Reward Points per Referral</Label>
              <Input
                type="number"
                min="0"
                value={form.loyalty_referral_reward_points}
                onChange={(e) => set("loyalty_referral_reward_points", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Points awarded to referrer on conversion</p>
            </div>
            <div>
              <Label>Max Referrals per Customer</Label>
              <Input
                type="number"
                min="0"
                value={form.loyalty_referral_max_per_customer}
                onChange={(e) => set("loyalty_referral_max_per_customer", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">0 = unlimited</p>
            </div>
            <div>
              <Label>Auto-Expiry Days</Label>
              <Input
                type="number"
                min="0"
                value={form.loyalty_referral_expiry_days}
                onChange={(e) => set("loyalty_referral_expiry_days", e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Days before pending referral expires (0 = never)</p>
            </div>
          </div>
        </div>

        <Separator className="bg-card/10" />

        {/* Tier Thresholds */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Gift className="size-4 text-muted-foreground" />
            Tier Thresholds (points)
          </h4>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Silver (min)</Label>
              <Input
                type="number"
                min="1"
                value={form.loyalty_tier_silver}
                onChange={(e) => set("loyalty_tier_silver", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Gold (min)</Label>
              <Input
                type="number"
                min="1"
                value={form.loyalty_tier_gold}
                onChange={(e) => set("loyalty_tier_gold", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Platinum (min)</Label>
              <Input
                type="number"
                min="1"
                value={form.loyalty_tier_platinum}
                onChange={(e) => set("loyalty_tier_platinum", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
