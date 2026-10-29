import type { TripStopDto } from '../types/plan';
import { buildPlanStopAccents } from './plan-stop-accents';

const base: TripStopDto = {
  id: 's1',
  tripId: 't1',
  tripDayId: 'd1',
  position: 1,
  name: 'Cafe',
  address: null,
  lat: 0,
  lng: 0,
  category: 'cafe',
  externalPlaceId: null,
  openingHoursRaw: null,
  locationId: null,
  durationMinutes: 45,
  bufferAfterMinutes: null,
  travelModeOverride: null,
  anchorTime: null,
  priority: 'nice',
  status: 'todo',
  tags: [],
  note: null,
  estimatedCostAmount: null,
  estimatedCostCurrency: null,
  costItems: [],
  travelFromPrevSeconds: 720,
  travelFromPrevDistanceM: null,
  travelModeUsed: null,
  schedule: null,
  conflicts: [],
};

describe('buildPlanStopAccents', () => {
  it('includes duration pill', () => {
    expect(buildPlanStopAccents(base).pills.some((p) => p.key === 'duration')).toBe(true);
  });

  it('puts must as top-right diagonal banner', () => {
    const { diagonalTr, ribbonTl } = buildPlanStopAccents({ ...base, priority: 'must' });
    expect(diagonalTr?.key).toBe('priority');
    expect(diagonalTr?.labelKey).toBe('planPriorityMust');
    expect(ribbonTl).toBeNull();
  });

  it('flags fixed-time without anchor pill', () => {
    const { fixedTime, ribbonTr, pills } = buildPlanStopAccents({
      ...base,
      anchorTime: '14:30',
    });
    expect(fixedTime).toBe(true);
    expect(ribbonTr).toBeNull();
    expect(pills.some((p) => p.key === 'anchor')).toBe(false);
  });

  it('does not put travel mode on the card', () => {
    const { pills } = buildPlanStopAccents({
      ...base,
      travelModeOverride: 'motorbike',
    });
    expect(pills.some((p) => p.key === 'mode')).toBe(false);
  });

  it('does not overlay conflicts as diagonal (chips only)', () => {
    const { diagonalTr } = buildPlanStopAccents({
      ...base,
      conflicts: [{ stopId: 's1', type: 'closed_on_arrival' }],
    });
    expect(diagonalTr).toBeNull();
  });
});
