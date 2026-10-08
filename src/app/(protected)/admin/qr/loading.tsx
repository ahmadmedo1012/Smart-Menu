import { QrPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): QR-page-shaped fallback (header +
// centered QR card) — was the spinner.
export default function AdminQrLoading() {
        return <QrPageSkeleton />
}
