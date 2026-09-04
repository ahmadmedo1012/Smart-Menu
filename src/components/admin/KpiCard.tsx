/**
 * Re-export shim (round79 Stage D — merge of the د1 duplication).
 * The unified KPI card now lives in shared/KpiCard.tsx; this file keeps every
 * existing admin/owner import path working without touching 8 consumer files.
 */
export { KpiCard, type KpiCardProps } from '@/components/shared/KpiCard';
