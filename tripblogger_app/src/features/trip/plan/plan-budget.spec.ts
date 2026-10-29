import { sumStopCosts, budgetProgress, isOverBudget } from './plan-budget';

describe('plan-budget', () => {
  it('sums stop estimated costs', () => {
    expect(
      sumStopCosts([
        { estimatedCostAmount: 1000000 } as never,
        { estimatedCostAmount: 2500000 } as never,
        { estimatedCostAmount: null } as never,
      ]),
    ).toBe(3500000);
  });

  it('detects over budget', () => {
    expect(isOverBudget(120, 100)).toBe(true);
    expect(isOverBudget(80, 100)).toBe(false);
    expect(budgetProgress(50, 100)).toBe(0.5);
  });
});
