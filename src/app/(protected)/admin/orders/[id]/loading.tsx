import { DetailPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): order-detail-shaped fallback (header +
// status timeline card + info grid + items card) — was the spinner.
export default function AdminOrderDetailLoading() {
        return <DetailPageSkeleton label="جارٍ تحميل تفاصيل الطلب…" />
}
