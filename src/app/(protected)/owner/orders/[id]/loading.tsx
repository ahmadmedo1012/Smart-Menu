import { DetailPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): order-detail-shaped fallback — was the spinner.
export default function OwnerOrderDetailLoading() {
        return <DetailPageSkeleton label="جارٍ تحميل تفاصيل الطلب…" />
}
