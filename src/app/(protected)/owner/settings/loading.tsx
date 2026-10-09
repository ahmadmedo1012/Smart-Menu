import { SettingsPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): settings-shaped fallback (header +
// stacked section cards) — was the spinner.
export default function OwnerSettingsLoading() {
        return <SettingsPageSkeleton cards={3} label="جارٍ تحميل الإعدادات…" />
}
