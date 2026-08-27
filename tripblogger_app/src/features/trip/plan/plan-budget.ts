import { stopCostTotal } from './plan-stop-cost';
import type { TripStopDto } from '../types/plan';

export function sumStopCosts(stops: TripStopDto[]): number {
  return stops.reduce((sum, s) => sum + stopCostTotal(s), 0);
}

export function budgetProgress(spent: number, total: number | null | undefined): number {
  if (total == null || total <= 0) return 0;
  return Math.min(1, spent / total);
}

export function isOverBudget(spent: number, total: number | null | undefined): boolean {
  return total != null && total > 0 && spent > total;
}
