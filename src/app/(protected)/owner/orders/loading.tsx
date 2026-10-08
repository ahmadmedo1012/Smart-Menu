import { OrdersPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r126 (P4-F1 M9, audit F1): orders-shaped skeleton (header + search +
// filter chips + order card stack) replaces the full-page spinner.
export default function OwnerOrdersLoading() {
        return <OrdersPageSkeleton />
}
