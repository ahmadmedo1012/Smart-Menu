import type { Metadata } from "next"
import { SystemEventsClient } from "./client"
import { PageHeader } from "@/components/shared/PageHeader"

export const metadata: Metadata = {
  title: "أحداث النظام",
}

export default function SystemEventsPage() {
  return (
    /* r131-F5 (A1 P0-8/P1-13): canonical container + page header (the bare
       15px-inheriting subtitle is now the 13px/72ch canonical line). */
    <div className="mx-auto max-w-[1280px] space-y-8">
      <PageHeader
        title="أحداث النظام"
        subtitle="سجل أحداث وتنبيهات النظام"
      />
      <SystemEventsClient />
    </div>
  )
}
