import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { AdminShell } from './AdminShell';

/**
 * r121-B-2/A-2/E-4 (IMPL-3) — server-side auth gate for the whole /admin tree,
 * the exact pattern r113-F114 shipped for /login: the session is resolved with
 * the same requireAuth() the API routes use, and role-inappropriate visitors
 * are redirected BEFORE any admin chrome streams (previously this layout was a
 * 'use client' component that returned null until its own /api/auth/me probe
 * resolved — a blank SSR shell on all 13 admin routes, 2-3 duplicate /me calls
 * per cold load, and a fake 32-char cookie was enough to render the full admin
 * shell to anonymous visitors before the client 401 kicked in).
 *
 * Role semantics are preserved verbatim from the old client gate
 * (admin/layout.tsx@r120): admin-family roles pass; an owner is sent to /owner;
 * anything else to /subscribe; no session at all to /login. sub_admin
 * permission filtering still happens per-page — useAccessGate consumes the
 * server-resolved {role, permissions} via AccessGateMeProvider (AdminShell).
 */
const ADMIN_ROLES = ['super_admin', 'sub_admin', 'admin'];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
        const auth = await requireAuth();
        if (!auth.authorized) redirect('/login');
        if (!ADMIN_ROLES.includes(auth.role)) {
                redirect(auth.role === 'owner' ? '/owner' : '/subscribe');
        }
        return (
                <AdminShell role={auth.role} permissions={auth.permissions ?? []}>
                        {children}
                </AdminShell>
        );
}
