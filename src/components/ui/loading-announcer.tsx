/**
 * Loading Announcer - WCAG 2.2 AA Accessibility Component
 *
 * Provides screen reader announcements for loading states.
 * This component announces loading status changes to users who rely on assistive technology.
 *
 * Usage:
 * ```tsx
 * <LoadingAnnouncer loading={isLoading} message="جاري تحميل البيانات..." />
 * ```
 */

"use client";

import { useEffect, useRef } from "react";

interface LoadingAnnouncerProps {
        /** Whether the loading state is active */
        loading: boolean;
        /** The message to announce when loading is active */
        message: string;
        /** Optional message to announce when loading completes */
        completedMessage?: string;
}

export function LoadingAnnouncer({
        loading,
        message,
        completedMessage = "تم التحميل",
}: LoadingAnnouncerProps) {
        const announcementRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
                if (loading && announcementRef.current) {
                        announcementRef.current.textContent = message;
                } else if (!loading && announcementRef.current && completedMessage) {
                        announcementRef.current.textContent = completedMessage;
                }
        }, [loading, message, completedMessage]);

        return (
                <div
                        ref={announcementRef}
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="sr-only"
                />
        );
}
