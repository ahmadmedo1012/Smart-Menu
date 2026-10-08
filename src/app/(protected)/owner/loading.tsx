import { DashboardSkeleton } from "@/components/shared/DashboardSkeletons"

// r126 (P4-F1 M9, audit F1): shape skeleton replaces the DefaultLoading
// spinner — same KPI/section rhythm as the hydrated dashboard (DESIGN.md
// "Skeleton for loading" law).
export default function OwnerLoading() {
        return <DashboardSkeleton />
}
