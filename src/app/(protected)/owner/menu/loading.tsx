import { MenuManagerSkeleton } from "@/components/shared/DashboardSkeletons"

// r126 (P4-F1 M9, audit F1): menu-manager-shaped skeleton (search + plan
// badge + category rows with item lines) replaces the full-page spinner.
export default function OwnerMenuLoading() {
        return <MenuManagerSkeleton />
}
