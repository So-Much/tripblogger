import { sumStopCosts } from './plan-stop-cost';
import type { TripStopDto } from '../types/plan';

describe('plan-stop-cost', () => {
  it('sums line items on a stop', () => {
    const stop = {
      costItems: [
        { id: '1', label: 'Food', unitAmount: 30000, quantity: 2 },
        { id: '2', label: 'Drink', unitAmount: 28000, quantity: 1 },
      ],
      estimatedCostAmount: null,
    } as TripStopDto;
    expect(sumStopCosts([stop])).toBe(88000);
  });
});
