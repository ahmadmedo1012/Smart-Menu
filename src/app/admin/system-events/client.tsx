"use client"

import { useEffect, useState } from "react"
import { csrfFetch } from "@/lib/csrf-client"
import { Loader2 } from "lucide-react"

type SystemEvent = {
  id: number
  type: string
  message: string
  createdAt: string
}

export function SystemEventsClient() {
  const [events, setEvents] = useState<SystemEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    csrfFetch("/api/admin/system-events")
      .then((r) => r.json())
      .then((d) => setEvents(d.data ?? d ?? []))
      .catch(() => setError("فشل تحميل أحداث النظام"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="size-6 animate-spin text-orange" /></div>
  if (error) return <div className="text-destructive p-4 rounded-lg border border-destructive/30 bg-destructive/10">{error}</div>

  return (
    <div className="rounded-lg border border-border/50">
      {events.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">لا توجد أحداث بعد</div>
      ) : (
        <div className="divide-y divide-border/50">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 p-4">
              <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                {new Date(ev.createdAt).toLocaleString("ar-LY")}
              </span>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted shrink-0">
                {ev.type}
              </span>
              <span className="text-sm">{ev.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
