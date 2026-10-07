import { MenuSkeleton } from "@/components/menu/MenuSkeleton"

/* r125 (11-b): هيكل تحميل على شكل المنيو بدل الغزل المجرّد — المسار هو صفحة
   المال (QR → منيو)؛ انظر تعليق MenuSkeleton.tsx للالتزام بمدارك. بقية
   المسارات الأربعين+ تبقى على DefaultLoading المشترك. */
export default function MenuSlugLoading() {
        return <MenuSkeleton />
}
