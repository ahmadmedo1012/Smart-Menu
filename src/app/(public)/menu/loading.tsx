import { DefaultLoading } from "@/components/shared/DefaultLoading"

/* r118-A5-F7: the /menu directory is the ONLY sibling without a loading.tsx —
   a force-dynamic page whose DB query pays the Neon cold-start (~2.1s measured)
   rendered a dead navigation with zero feedback. Same one-line pattern as
   menu/[slug]/loading.tsx and 40+ other routes. */
export default function MenuDirectoryLoading() {
        return <DefaultLoading />
}
