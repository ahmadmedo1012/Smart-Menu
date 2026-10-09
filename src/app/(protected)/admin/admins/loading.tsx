import { ListPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): admins-list-shaped fallback — was the spinner.
export default function AdminAdminsLoading() {
        return <ListPageSkeleton rows={6} label="جارٍ تحميل المسؤولين…" />
}
