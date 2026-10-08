import { ListPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): restaurants-list-shaped fallback
// (header + search + row cards) — was the spinner.
export default function AdminRestaurantsLoading() {
        return <ListPageSkeleton rows={6} label="جارٍ تحميل المطاعم..." />
}
