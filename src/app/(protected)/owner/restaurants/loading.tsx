import { ListPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): multi-menu list-shaped fallback — was the spinner.
export default function OwnerRestaurantsLoading() {
        return <ListPageSkeleton rows={4} label="جارٍ تحميل المنيوهات..." />
}
