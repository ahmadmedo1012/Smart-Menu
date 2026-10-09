import { ListPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): menu-manager-shaped fallback (header +
// filters + grouped item rows) — was the spinner.
export default function AdminMenuLoading() {
        return <ListPageSkeleton rows={6} label="جارٍ تحميل المنيو…" />
}
