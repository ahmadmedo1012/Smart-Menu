'use client';

import { Button } from '@/components/ui/button';
import {
        Dialog,
        DialogContent,
        DialogDescription,
        DialogHeader,
        DialogTitle,
} from '@/components/ui/dialog';

/**
 * r131-F5 (A1 P1-8, fleet ruling "window.confirm → AlertDialog"): the shared
 * Arabic destructive-confirm for owner/admin pages — a real modal (focus trap,
 * Escape, labelled) instead of the native window.confirm, riding the canonical
 * Dialog primitive. The confirm action uses the destructive variant; `busy`
 * swaps the label to a spinner and blocks double-submits (Button loading
 * contract).
 */
export function ConfirmDialog({
        open,
        onOpenChange,
        title = 'تأكيد الإجراء',
        description,
        confirmLabel = 'تأكيد',
        cancelLabel = 'إلغاء',
        onConfirm,
        busy = false,
        destructive = true,
        children,
}: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        title?: string;
        /** What will happen — REQUIRED for an honest confirm (never a bare "هل أنت متأكد؟"). */
        description: React.ReactNode;
        confirmLabel?: string;
        cancelLabel?: string;
        onConfirm: () => void;
        /** While the mutation is in flight (spinner + disabled). */
        busy?: boolean;
        /** Destructive confirms render the danger button (default true). */
        destructive?: boolean;
        /** Optional extra content (e.g. the affected resource name list). */
        children?: React.ReactNode;
}) {
        return (
                <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
                        <DialogContent>
                                <DialogHeader>
                                        <DialogTitle>{title}</DialogTitle>
                                        <DialogDescription>{description}</DialogDescription>
                                </DialogHeader>
                                {children}
                                <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                                                {cancelLabel}
                                        </Button>
                                        <Button
                                                variant={destructive ? 'destructive' : 'orange'}
                                                onClick={onConfirm}
                                                loading={busy}
                                                aria-busy={busy || undefined}
                                        >
                                                {confirmLabel}
                                        </Button>
                                </div>
                        </DialogContent>
                </Dialog>
        );
}
