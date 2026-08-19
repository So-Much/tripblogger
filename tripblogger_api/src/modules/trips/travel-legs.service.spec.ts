import { MOTORBIKE_OSRM_FACTOR } from '@tripblogger/itinerary-engine';
import { TravelLegsService } from './travel-legs.service';
import type { TripStopEntity } from './entities/trip-stop.entity';

function stop(
  overrides: Partial<TripStopEntity> & { id: string; lat: string; lng: string },
): TripStopEntity {
  return {
    tripId: 'trip-1',
    tripDayId: 'day-0',
    position: 0,
    name: 'Stop',
    address: null,
    category: null,
    externalPlaceId: null,
    openingHoursRaw: null,
    locationId: null,
    durationMinutes: 60,
    bufferAfterMinutes: null,
    travelModeOverride: null,
    anchorTime: null,
    priority: 'nice',
    status: 'todo',
    travelFromPrevSeconds: null,
    travelFromPrevDistanceM: null,
    travelModeUsed: null,
    travelComputedAt: null,
    note: null,
    estimatedCostAmount: null,
    estimatedCostCurrency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    trip: null as any,
    tripDay: null,
    location: null,
    ...overrides,
  };
}

describe('TravelLegsService.recomputeDayLegs', () => {
  it('sets first stop travel to 0 and applies motorbike factor on legs', async () => {
    const osrm = {
      tableLegs: jest.fn().mockResolvedValue([{ durationS: 1000, distanceM: 2500 }]),
    };
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const svc = new TravelLegsService(osrm as any, redis as any);

    const stops = [
      stop({ id: 'a', lat: '11.9400', lng: '108.4500', position: 0 }),
      stop({ id: 'b', lat: '11.9500', lng: '108.4600', position: 1 }),
    ];

    await svc.recomputeDayLegs(stops, 'motorbike');

    expect(stops[0].travelFromPrevSeconds).toBe(0);
    expect(stops[0].travelFromPrevDistanceM).toBe(0);
    expect(stops[1].travelFromPrevSeconds).toBe(Math.round(1000 * MOTORBIKE_OSRM_FACTOR));
    expect(stops[1].travelFromPrevDistanceM).toBe(2500);
    expect(stops[1].travelModeUsed).toBe('motorbike');
    expect(osrm.tableLegs).toHaveBeenCalledWith(
      [
        { lat: 11.94, lng: 108.45 },
        { lat: 11.95, lng: 108.46 },
      ],
      'car',
    );
    expect(redis.set).toHaveBeenCalledWith(
      'map:leg:v1:car:11.9400,108.4500:11.9500,108.4600',
      JSON.stringify({ durationS: 1000, distanceM: 2500 }),
      'EX',
      7 * 24 * 60 * 60,
    );
  });

  it('uses Redis cache and skips OSRM when hit', async () => {
    const osrm = { tableLegs: jest.fn() };
    const redis = {
      get: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ durationS: 400, distanceM: 900 })),
      set: jest.fn(),
    };
    const svc = new TravelLegsService(osrm as any, redis as any);

    const stops = [
      stop({ id: 'a', lat: '11.9400', lng: '108.4500', position: 0 }),
      stop({ id: 'b', lat: '11.9500', lng: '108.4600', position: 1 }),
    ];

    await svc.recomputeDayLegs(stops, 'car');

    expect(osrm.tableLegs).not.toHaveBeenCalled();
    expect(stops[1].travelFromPrevSeconds).toBe(400);
    expect(stops[1].travelFromPrevDistanceM).toBe(900);
  });

  it('clamps OSRM 0s legs to 60s so consecutive stops never persist 0 travel', async () => {
    const osrm = {
      tableLegs: jest.fn().mockResolvedValue([{ durationS: 0, distanceM: 0 }]),
    };
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const svc = new TravelLegsService(osrm as any, redis as any);

    const stops = [
      stop({ id: 'a', lat: '11.9400', lng: '108.4500', position: 0 }),
      stop({ id: 'b', lat: '11.9401', lng: '108.4501', position: 1 }),
    ];

    await svc.recomputeDayLegs(stops, 'foot');

    expect(stops[0].travelFromPrevSeconds).toBe(0);
    expect(stops[1].travelFromPrevSeconds).toBe(60);
  });
});
