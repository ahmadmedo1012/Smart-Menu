import { MotionProvider } from "@/components/shared/MotionProvider";

/* P27-C2 fix: the legal pages render the marketing Header (the tubelight
   LayoutMotion) + Footer + ScrollReveal — all m.* consumers (LazyMotion).
   The provider moved here from the (public) root layout (the landing's
   chunk-graph diet). See menu/layout.tsx for the full law. */
export default function TermsLayout({ children }: { children: React.ReactNode }) {
        return <MotionProvider>{children}</MotionProvider>;
}
