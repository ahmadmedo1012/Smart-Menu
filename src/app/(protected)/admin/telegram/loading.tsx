import { SettingsPageSkeleton } from "@/components/shared/DashboardSkeletons"

// r131-F4b (F5 completion, A11 SM-2): telegram-settings-shaped fallback — was the spinner.
export default function AdminTelegramLoading() {
        return <SettingsPageSkeleton cards={3} label="جارٍ تحميل إعدادات التليجرام..." />
}
