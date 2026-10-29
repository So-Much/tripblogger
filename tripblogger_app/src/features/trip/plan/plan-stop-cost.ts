import type { StopCostItem, TripStopDto } from '../types/plan';

export type { StopCostItem };

export function newStopCostItem(): StopCostItem {
  return {
    id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    unitAmount: 0,
    quantity: 1,
  };
}

export function stopCostItemTotal(item: StopCostItem): number {
  return item.unitAmount * item.quantity;
}

export function stopCostTotal(
  stop: Pick<TripStopDto, 'costItems' | 'estimatedCostAmount'>,
): number {
  if (stop.costItems?.length) {
    return stop.costItems.reduce((sum, item) => sum + stopCostItemTotal(item), 0);
  }
  return stop.estimatedCostAmount ?? 0;
}

export function normalizeCostItems(items: StopCostItem[]): StopCostItem[] {
  return items
    .map((item) => ({
      id: item.id,
      label: item.label.trim(),
      unitAmount: Math.max(0, item.unitAmount),
      quantity: Math.max(1, Math.floor(item.quantity)),
    }))
    .filter((item) => item.label.length > 0 && item.unitAmount > 0);
}

export function sumStopCosts(stops: TripStopDto[]): number {
  return stops.reduce((sum, stop) => sum + stopCostTotal(stop), 0);
}

export function collectTripStops(
  trip: { days: { stops: TripStopDto[] }[]; ideaStops: TripStopDto[] },
): TripStopDto[] {
  return [...trip.days.flatMap((d) => d.stops), ...trip.ideaStops];
}
