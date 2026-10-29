import { MOTORBIKE_OSRM_FACTOR } from './constants';
import { applyMotorbikeFactor, osrmProfileForPlanMode } from './travel-mode';

describe('osrmProfileForPlanMode', () => {
  it('maps plan modes to OSRM profiles', () => {
    expect(osrmProfileForPlanMode('car')).toBe('car');
    expect(osrmProfileForPlanMode('bike')).toBe('bike');
    expect(osrmProfileForPlanMode('foot')).toBe('foot');
    expect(osrmProfileForPlanMode('motorbike')).toBe('car');
  });
});

describe('applyMotorbikeFactor', () => {
  it('scales only motorbike durations by MOTORBIKE_OSRM_FACTOR', () => {
    expect(applyMotorbikeFactor(1000, 'motorbike')).toBe(1000 * MOTORBIKE_OSRM_FACTOR);
    expect(applyMotorbikeFactor(1000, 'car')).toBe(1000);
    expect(applyMotorbikeFactor(1000, 'bike')).toBe(1000);
    expect(applyMotorbikeFactor(1000, 'foot')).toBe(1000);
  });
});
