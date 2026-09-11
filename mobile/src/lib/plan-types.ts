// Mobile port: types only. The web `fetchPlans()` helper is replaced by
// `usePlans()` (TanStack Query) in src/hooks/queries.

export interface Plan {
  id: number;
  name: string;
  nameAr: string;
  price: number;
  periodDays: number;
  features: string[];
  maxMenus: number;
  maxItems: number;
  maxOrders: number;
  sortOrder: number;
}

export interface PlanSummary {
  id: number;
  name: string;
  nameAr: string;
  price: number;
}
