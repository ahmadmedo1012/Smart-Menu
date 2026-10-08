import { DashboardSkeleton } from "@/components/shared/DashboardSkeletons"

// r126 (P4-F1b M9 completion, audit F1): admin home rides the same KPI +
// breakdown-list + quick-actions skeleton as the owner dashboard — the
// DefaultLoading spinner stayed here when the interrupted P4-F1 pass
// converted the other top dashboard routes.
export default function AdminLoading() {
        return <DashboardSkeleton />
}
