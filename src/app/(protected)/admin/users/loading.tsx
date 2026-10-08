import { TablePageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2 / fleet ruling "loading.tsx = shape
// skeletons"): users-page-shaped fallback (header + filters + canonical
// 11px-header table) — was the 60vh DefaultLoading spinner.
export default function AdminUsersLoading() {
        return <TablePageSkeleton rows={6} label="جارٍ تحميل المستخدمين..." />
}
