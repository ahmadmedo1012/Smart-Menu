import { DefaultLoading } from "@/components/shared/DefaultLoading"

/* r97-X1: المسار كان يملك error.tsx بلا حدّ تحميل — نفس نمط السطر الواحد
   المستخدم في 40+ loading.tsx أخرى (مثل pricing/loading.tsx). */
export default function MenuSlugLoading() {
        return <DefaultLoading />
}
