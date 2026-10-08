import { TablePageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): audit-table-shaped fallback (header +
// filters + canonical table) — was the spinner.
export default function AdminAuditLogsLoading() {
        return <TablePageSkeleton rows={6} label="جارٍ تحميل سجل التدقيق..." />
}
