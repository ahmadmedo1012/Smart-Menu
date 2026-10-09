import { ListPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): reviews-feed-shaped fallback — was the spinner.
export default function OwnerReviewsLoading() {
        return <ListPageSkeleton rows={5} rowHeight="h-24" label="جارٍ تحميل التقييمات…" />
}
