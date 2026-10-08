import { KpiGridSkeleton, ListCardSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): loyalty-page-shaped fallback — KPI band
// + the 3-column grid the page's own loading branch paints — was the spinner.
export default function OwnerLoyaltyLoading() {
        return (
                <div className="space-y-8">
                        <KpiGridSkeleton count={4} />
                        <div className="grid gap-6 lg:grid-cols-3">
                                <ListCardSkeleton />
                                <ListCardSkeleton rows={3} />
                                <ListCardSkeleton rows={3} />
                        </div>
                </div>
        )
}
