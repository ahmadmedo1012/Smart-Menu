import type { Metadata } from "next"
import { SystemEventsClient } from "./client"

export const metadata: Metadata = {
  title: "أحداث النظام",
}

export default function SystemEventsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">أحداث النظام</h1>
        <p className="text-muted-foreground">سجل أحداث وتنبيهات النظام</p>
      </div>
      <SystemEventsClient />
    </div>
  )
}
