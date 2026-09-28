import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserSubscriptionState } from '@/lib/subscription-guard';
import { OwnerShell, getPlanDaysRemaining } from './OwnerShell';

/**
 * r121-B-2/A-2/E-4 (IMPL-3) — server-side auth gate for the whole /owner tree,
 * the exact pattern r113-F114 shipped for /login: the session is resolved with
 * the same requireAuth() the API routes use, and role-inappropriate visitors
 * are redirected BEFORE any owner chrome streams (previously this layout was a
 * 'use client' component that returned null until its own /api/auth/me probe
 * resolved — a blank SSR shell on all 10 owner routes, a duplicate /me call on
 * every cold load, and a fake 32-char cookie was enough to render the full
 * owner shell to anonymous visitors before the client 401 kicked in).
 *
 * Role semantics are preserved verbatim from the old client gate
 * (owner/layout.tsx@r120): only role 'owner' passes; USER/UNPAID visitors go
 * to /subscribe; admin-family roles to /admin; everyone else to /login.
 *
 * r121-P-4/P-5: the same server pass resolves the two subscription facts the
 * dashboards need — planEnd (expiry banner; via the EXISTING
 * getUserSubscriptionState() helper — zero API change) and the pending-payment
 * date (honest pre-activation state on the dashboard). Two cheap reads: the
 * pending lookup rides the SubscriptionPayment_pending_user_unique partial
 * index from round90-F1.
 */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
        const auth = await requireAuth();
        if (!auth.authorized) redirect('/login');
        if (auth.role !== 'owner') {
                // (role-aware ladder copied from the old client gate — see header note)
                if (auth.role === 'USER' || auth.subscriptionStatus === 'UNPAID') redirect('/subscribe');
                if (auth.role === 'super_admin' || auth.role === 'sub_admin' || auth.role === 'admin') {
                        redirect('/admin');
                }
                redirect('/login');
        }

        const [subscription, pendingPayment] = await Promise.all([
                getUserSubscriptionState(auth.userId),
                prisma.subscriptionPayment.findFirst({
                        where: { userId: auth.userId, status: 'pending' },
                        select: { createdAt: true },
                }),
        ]);
        const planEndIso =
                subscription.planEnd instanceof Date
                        ? subscription.planEnd.toISOString()
                        : subscription.planEnd
                                ? String(subscription.planEnd)
                                : null;
        // r121-ADV1-2: days resolved ONCE on the server — the shell renders the
        // same value at SSR and hydration (no new Date() clock mismatch).
        const planDays = getPlanDaysRemaining(planEndIso);

        return (
                <OwnerShell
                        planDays={planDays}
                        pendingPaymentSince={pendingPayment?.createdAt.toISOString() ?? null}
                >
                        {children}
                </OwnerShell>
        );
}
