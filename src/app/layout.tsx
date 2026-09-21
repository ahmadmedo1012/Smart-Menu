import './globals.css';

/**
 * r119-S5-P1-3: the app previously used the "multiple root layouts" pattern
 * ((public)/(protected) each rendered their own <html>) with NO root layout —
 * the exact pattern the Next.js docs warn about: the ROOT not-found boundary
 * (unmatched URLs + every notFound() call, which Next 16 routes to the root
 * boundary regardless of group boundaries — live-proven: all 404s rendered
 * the bare <html id="__next_error__"> shell with NO lang/dir and the homepage
 * <title>) got no layout at all.
 *
 * This root layout gives EVERY render path — group pages, the root not-found,
 * and the root error boundary — a proper <html lang="ar" dir="rtl"> + globals.css
 * + the shared body shell. The group layouts now render fragments (their
 * <head> links/metas hoist via React 19; their providers wrap as before).
 */
export default function RootLayout({
        children,
}: Readonly<{
        children: React.ReactNode;
}>) {
        return (
                <html lang="ar" dir="rtl" suppressHydrationWarning>
                        <body className="flex min-h-dvh flex-col overflow-x-clip bg-background antialiased">
                                {children}
                        </body>
                </html>
        );
}
