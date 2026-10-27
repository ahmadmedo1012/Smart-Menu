import Link from "next/link";
import {
        FileQuestion,
        Store,
        Star,
        LayoutDashboard,
        MessageCircle,
        UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

/**
 * r111-F12 (layer 2 of 3): themed 404 boundary for the (public) route group.
 *
 * Catches every notFound() raised inside (public) — bad menu slugs
 * (menu/[slug] pages call notFound() for unknown restaurants) AND the
 * [...notfound] catch-all (layer 1) — and renders them through the full
 * (public) root layout: ThemeProvider + fonts + globals.css + RTL shell.
 *
 * Why the wrapper carries its own dir/lang + vertical layout: Next.js's error
 * shell can strip html/body attributes on some 404 entry paths (proven live in
 * r111 on both entry paths) — the (public) layout already sets them, but the
 * wrapper guarantees RTL + centering even in the stripped-shell case.
 *
 * No <main> here: this renders inside main#main-content provided by the
 * (public) layout (nested main would violate the axe "one main landmark" rule).
 * No MotionProvider needed either (P27-C): this page's motion consumers are
 * CSS twins now — ThemeToggle animates via the .ai-theme rules in globals.css;
 * the m.* consumer segments (menu/pricing/privacy/terms) mount their own
 * provider; the motion engine chunk never loads on / or 404.
 */

const SUGGESTIONS = [
        { href: "/", label: "الرئيسية", icon: Store },
        { href: "/pricing", label: "الخطط والأسعار", icon: Star },
        { href: "/login", label: "لوحة التحكم", icon: LayoutDashboard },
        { href: "/menu/al-waha-cafe-demo", label: "منيو تجريبي", icon: MessageCircle },
];

export default function NotFound() {
        return (
                <>
                        {/* 404 must stay out of search indexes even when reached via a
                            notFound() from a real page (bad slug), where this boundary's
                            own metadata export wouldn't apply — React 19 hoists this. */}
                        <meta name="robots" content="noindex" />
                        <div
                                dir="rtl"
                                lang="ar"
                                className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16"
                        >
                                {/* Minimal top bar (same approach as the pre-r111 root 404):
                                    logo + theme toggle, zero landing-Header payload in the
                                    sync chunks of every route that can throw notFound(). */}
                                <header className="absolute inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-4 sm:px-8">
                                        <Link href="/" className="group flex items-center gap-2.5" aria-label="الرئيسية">
                                                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                                                        <UtensilsCrossed className="size-5" aria-hidden="true" />
                                                </span>
                                                <span className="text-lg font-bold text-foreground">الربط الذكي</span>
                                        </Link>
                                        <ThemeToggle />
                                </header>

                                {/* Same ambient background language as the rest of the app */}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-orange/5" />
                                <div className="pointer-events-none absolute left-10 top-10 size-56 animate-float rounded-full bg-primary/5 blur-3xl" />
                                <div className="pointer-events-none absolute bottom-10 right-10 size-64 animate-float-delayed rounded-full bg-orange/5 blur-3xl" />

                                <div className="relative z-10 flex flex-col items-center text-center animate-fade-in">
                                        <div className="relative mb-8">
                                                <div className="glass mx-auto flex size-24 animate-float items-center justify-center rounded-full">
                                                        <FileQuestion className="size-12 text-primary" />
                                                </div>
                                                <div className="absolute -inset-2 -z-10 rounded-full bg-primary/10 blur-xl" />
                                        </div>
                                        <div className="mb-4 select-none text-8xl font-bold leading-none text-foreground md:text-9xl" aria-hidden="true">
                                                404
                                        </div>
                                        <h1 className="mb-4 text-3xl font-bold md:text-4xl">الصفحة غير موجودة</h1>
                                        <p className="mb-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                                                الرابط الذي تبحث عنه غير صحيح أو تم نقله
                                        </p>

                                        <nav aria-label="اقتراحات التنقل" className="mb-8 flex flex-wrap justify-center gap-3">
                                                {SUGGESTIONS.map((s) => {
                                                        const Icon = s.icon;
                                                        return (
                                                                <Link key={s.href} href={s.href}>
                                                                        <Button variant="outline" size="sm" className="h-10 gap-2">
                                                                                <Icon className="size-4" aria-hidden="true" />
                                                                                {s.label}
                                                                        </Button>
                                                                </Link>
                                                        );
                                                })}
                                        </nav>

                                        <div className="flex flex-col gap-4 sm:flex-row">
                                                <Link href="/">
                                                        <Button size="lg" className="h-12 px-8 text-base">
                                                                العودة إلى الرئيسية
                                                        </Button>
                                                </Link>
                                        </div>

                                        <p className="mt-16 select-none text-xs text-muted-foreground/50">
                                                الربط الذكي &mdash; Smart Menu
                                        </p>
                                </div>
                        </div>
                </>
        );
}
