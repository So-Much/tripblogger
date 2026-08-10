import { NotFoundException } from '@nestjs/common';
import { TripsService } from './trips.service';
import type { CreateTripDto } from './dto/create-trip.dto';
import type { AddStopDto } from './dto/add-stop.dto';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripStopEntity } from './entities/trip-stop.entity';
import { TripEntity } from './entities/trip.entity';

type MockRepo = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  remove: jest.Mock;
  delete: jest.Mock;
  manager: { transaction: jest.Mock };
};

function makeRepo(): MockRepo {
  return {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    remove: jest.fn(async (x) => x),
    delete: jest.fn(async () => ({ affected: 1 })),
    manager: { transaction: jest.fn() },
  };
}

function makeTravelLegs() {
  return {
    recomputeDayLegs: jest.fn(async (stops: any[]) => {
      if (!stops.length) return;
      stops[0].travelFromPrevSeconds = 0;
      stops[0].travelFromPrevDistanceM = 0;
      for (let i = 1; i < stops.length; i++) {
        stops[i].travelFromPrevSeconds = 120;
        stops[i].travelFromPrevDistanceM = 500;
        stops[i].travelModeUsed = 'motorbike';
      }
    }),
  };
}

function makeService(repos?: {
  trips?: MockRepo;
  days?: MockRepo;
  stops?: MockRepo;
  tags?: MockRepo;
  travelLegs?: ReturnType<typeof makeTravelLegs>;
}) {
  const trips = repos?.trips ?? makeRepo();
  const days = repos?.days ?? makeRepo();
  const stops = repos?.stops ?? makeRepo();
  const tags = repos?.tags ?? makeRepo();
  const travelLegs = repos?.travelLegs ?? makeTravelLegs();
  const sharedManager = trips.manager;
  days.manager = sharedManager;
  stops.manager = sharedManager;
  tags.manager = sharedManager;
  sharedManager.transaction.mockImplementation(async (cb: (em: any) => Promise<unknown>) => {
    const em = {
      getRepository: (Entity: unknown) => {
        if (Entity === TripEntity) return trips;
        if (Entity === TripDayEntity) return days;
        if (Entity === TripStopEntity) return stops;
        return tags;
      },
    };
    return cb(em);
  });
  const svc = new TripsService(
    trips as any,
    days as any,
    stops as any,
    tags as any,
    travelLegs as any,
  );
  return { svc, trips, days, stops, tags, travelLegs };
}

function baseTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trip-1',
    userId: 'user-1',
    title: 'Đà Lạt 3 ngày',
    destinationLabel: 'Đà Lạt',
    destinationLat: '11.9404',
    destinationLng: '108.4583',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    defaultTravelMode: 'motorbike',
    defaultBufferMinutes: 15,
    defaultDayStartTime: '08:00',
    status: 'draft',
    version: 1,
    ...overrides,
  };
}

const baseCreateDto: CreateTripDto = {
  title: 'Đà Lạt 3 ngày',
  destinationLabel: 'Đà Lạt',
  destinationLat: 11.9404,
  destinationLng: 108.4583,
  startDate: '2026-08-10',
  endDate: '2026-08-12',
};

describe('TripsService.create', () => {
  it('creates one trip_day per calendar day inclusive', async () => {
    const { svc, trips, days, stops, tags } = makeService();

    trips.save.mockImplementation(async (t: any) => ({
      ...t,
      id: 'trip-1',
      status: 'draft',
      version: 1,
      defaultTravelMode: t.defaultTravelMode ?? 'motorbike',
      defaultBufferMinutes: t.defaultBufferMinutes ?? 15,
      defaultDayStartTime: t.defaultDayStartTime ?? '08:00',
    }));
    days.save.mockImplementation(async (list: any[]) =>
      list.map((d, i) => ({ ...d, id: `day-${i}` })),
    );

    // findOne path after create
    trips.findOne.mockResolvedValue({
      id: 'trip-1',
      userId: 'user-1',
      title: baseCreateDto.title,
      destinationLabel: baseCreateDto.destinationLabel,
      destinationLat: String(baseCreateDto.destinationLat),
      destinationLng: String(baseCreateDto.destinationLng),
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      defaultTravelMode: 'motorbike',
      defaultBufferMinutes: 15,
      defaultDayStartTime: '08:00',
      status: 'draft',
      version: 1,
    });
    days.find.mockResolvedValue([
      { id: 'day-0', tripId: 'trip-1', date: '2026-08-10', dayIndex: 0, startTime: null },
      { id: 'day-1', tripId: 'trip-1', date: '2026-08-11', dayIndex: 1, startTime: null },
      { id: 'day-2', tripId: 'trip-1', date: '2026-08-12', dayIndex: 2, startTime: null },
    ]);
    stops.find.mockResolvedValue([]);
    tags.find.mockResolvedValue([]);

    const result = await svc.create('user-1', baseCreateDto);

    expect(days.save).toHaveBeenCalled();
    const savedDays = days.save.mock.calls[0][0] as Array<{
      date: string;
      dayIndex: number;
      tripId: string;
    }>;
    expect(savedDays).toHaveLength(3);
    expect(savedDays.map((d) => d.dayIndex)).toEqual([0, 1, 2]);
    expect(savedDays.map((d) => d.date)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
    ]);
    expect(savedDays.every((d) => d.tripId === 'trip-1')).toBe(true);

    expect(result.days).toHaveLength(3);
    expect(result.status).toBe('draft');
    expect(result.version).toBe(1);
    expect(result.defaultBufferMinutes).toBe(15);
    expect(result.defaultDayStartTime).toBe('08:00');
    expect(result.defaultTravelMode).toBe('motorbike');
  });
});

describe('TripsService.findOne', () => {
  it('rejects access to another users trip on findOne', async () => {
    const { svc, trips } = makeService();
    trips.findOne.mockResolvedValue({
      id: 'trip-1',
      userId: 'other-user',
      title: 'Secret',
    });

    await expect(svc.findOne('user-1', 'trip-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects missing trip with NotFound', async () => {
    const { svc, trips } = makeService();
    trips.findOne.mockResolvedValue(null);

    await expect(svc.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('TripsService.patch (date range)', () => {
  it('shrink moves stops from removed days into idea bucket and renumbers positions', async () => {
    const { svc, trips, days, stops, tags } = makeService();

    const day0 = { id: 'day-0', tripId: 'trip-1', date: '2026-08-10', dayIndex: 0, startTime: null };
    const day1 = { id: 'day-1', tripId: 'trip-1', date: '2026-08-11', dayIndex: 1, startTime: null };
    const day2 = { id: 'day-2', tripId: 'trip-1', date: '2026-08-12', dayIndex: 2, startTime: null };

    const existingIdea = {
      id: 'stop-idea',
      tripId: 'trip-1',
      tripDayId: null,
      position: 0,
      name: 'Idea cafe',
      address: null,
      lat: '11.9',
      lng: '108.4',
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
    };
    const stopOnDay2a = {
      ...existingIdea,
      id: 'stop-a',
      tripDayId: 'day-2',
      position: 0,
      name: 'Day2 A',
    };
    const stopOnDay2b = {
      ...existingIdea,
      id: 'stop-b',
      tripDayId: 'day-2',
      position: 1,
      name: 'Day2 B',
    };

    trips.findOne
      .mockResolvedValueOnce(baseTrip()) // ownership load inside patch
      .mockResolvedValueOnce(
        baseTrip({ endDate: '2026-08-11', version: 2 }),
      ); // findOne after patch

    days.find
      .mockResolvedValueOnce([day0, day1, day2]) // inside patch transaction
      .mockResolvedValueOnce([day0, day1]); // findOne after

    stops.find
      .mockResolvedValueOnce([existingIdea, stopOnDay2a, stopOnDay2b]) // inside patch
      .mockResolvedValueOnce([
        { ...existingIdea, position: 0 },
        { ...stopOnDay2a, tripDayId: null, position: 1 },
        { ...stopOnDay2b, tripDayId: null, position: 2 },
      ]); // findOne after

    tags.find.mockResolvedValue([]);

    const result = await svc.patch('user-1', 'trip-1', { endDate: '2026-08-11' });

    expect(trips.manager.transaction).toHaveBeenCalled();
    expect(days.remove).toHaveBeenCalledWith([day2]);

    const savedStops = stops.save.mock.calls.find((c) =>
      Array.isArray(c[0]) && c[0].some((s: any) => s.id === 'stop-a'),
    )?.[0] as Array<{ id: string; tripDayId: string | null; position: number }>;
    expect(savedStops).toBeDefined();
    expect(savedStops.find((s) => s.id === 'stop-a')).toMatchObject({
      tripDayId: null,
      position: 1,
    });
    expect(savedStops.find((s) => s.id === 'stop-b')).toMatchObject({
      tripDayId: null,
      position: 2,
    });
    expect(savedStops.find((s) => s.id === 'stop-idea')).toMatchObject({
      tripDayId: null,
      position: 0,
    });

    expect(result.days.map((d) => d.date)).toEqual(['2026-08-10', '2026-08-11']);
    expect(result.ideaStops.map((s) => s.id)).toEqual(['stop-idea', 'stop-a', 'stop-b']);
    expect(result.ideaStops.map((s) => s.position)).toEqual([0, 1, 2]);
    expect(result.endDate).toBe('2026-08-11');
  });

  it('expand adds missing trip_days for new dates', async () => {
    const { svc, trips, days, stops, tags } = makeService();

    const day0 = { id: 'day-0', tripId: 'trip-1', date: '2026-08-10', dayIndex: 0, startTime: null };
    const day1 = { id: 'day-1', tripId: 'trip-1', date: '2026-08-11', dayIndex: 1, startTime: null };

    trips.findOne
      .mockResolvedValueOnce(baseTrip({ endDate: '2026-08-11' }))
      .mockResolvedValueOnce(baseTrip({ endDate: '2026-08-13', version: 2 }));

    days.find
      .mockResolvedValueOnce([day0, day1])
      .mockResolvedValueOnce([
        day0,
        day1,
        { id: 'day-2', tripId: 'trip-1', date: '2026-08-12', dayIndex: 2, startTime: null },
        { id: 'day-3', tripId: 'trip-1', date: '2026-08-13', dayIndex: 3, startTime: null },
      ]);
    stops.find.mockResolvedValue([]);
    tags.find.mockResolvedValue([]);

    const result = await svc.patch('user-1', 'trip-1', { endDate: '2026-08-13' });

    expect(trips.manager.transaction).toHaveBeenCalled();
    const createdDaysCall = days.save.mock.calls.find(
      (c) => Array.isArray(c[0]) && c[0].some((d: any) => d.date === '2026-08-12'),
    );
    expect(createdDaysCall).toBeDefined();
    const created = createdDaysCall![0] as Array<{ date: string; dayIndex: number }>;
    expect(created.map((d) => d.date)).toEqual(['2026-08-12', '2026-08-13']);
    expect(created.map((d) => d.dayIndex)).toEqual([2, 3]);

    expect(result.days).toHaveLength(4);
    expect(result.endDate).toBe('2026-08-13');
  });

  it('rejects patch for another users trip', async () => {
    const { svc, trips } = makeService();
    trips.findOne.mockResolvedValue(baseTrip({ userId: 'other-user' }));

    await expect(svc.patch('user-1', 'trip-1', { title: 'Nope' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('TripsService.patchDay', () => {
  it('updates day startTime and returns trip detail', async () => {
    const { svc, trips, days, stops, tags } = makeService();
    const day1 = { id: 'day-1', tripId: 'trip-1', date: '2026-08-11', dayIndex: 1, startTime: null };

    trips.findOne.mockResolvedValue(baseTrip({ version: 2 }));
    days.findOne.mockResolvedValue(day1);
    days.find.mockResolvedValue([
      { id: 'day-0', tripId: 'trip-1', date: '2026-08-10', dayIndex: 0, startTime: null },
      { ...day1, startTime: '09:30' },
      { id: 'day-2', tripId: 'trip-1', date: '2026-08-12', dayIndex: 2, startTime: null },
    ]);
    stops.find.mockResolvedValue([]);
    tags.find.mockResolvedValue([]);

    const result = await svc.patchDay('user-1', 'trip-1', 'day-1', { startTime: '09:30' });

    expect(days.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'day-1', startTime: '09:30' }));
    expect(result.days.find((d) => d.id === 'day-1')?.startTime).toBe('09:30');
  });

  it('rejects patchDay when trip not owned', async () => {
    const { svc, trips } = makeService();
    trips.findOne.mockResolvedValue(baseTrip({ userId: 'other-user' }));

    await expect(
      svc.patchDay('user-1', 'trip-1', 'day-1', { startTime: null }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('TripsService.remove', () => {
  it('deletes owned trip', async () => {
    const { svc, trips } = makeService();
    const trip = baseTrip();
    trips.findOne.mockResolvedValue(trip);

    await svc.remove('user-1', 'trip-1');

    expect(trips.remove).toHaveBeenCalledWith(trip);
  });

  it('rejects delete for another users trip', async () => {
    const { svc, trips } = makeService();
    trips.findOne.mockResolvedValue(baseTrip({ userId: 'other-user' }));

    await expect(svc.remove('user-1', 'trip-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

const placeDb = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Cafe A',
  address: '1 Hoa Binh',
  lat: 11.9412,
  lng: 108.4589,
  category: 'cafe',
  openingHours: 'Mo-Su 08:00-22:00',
  source: 'db',
};

const placeOsm = {
  id: 'node/123',
  name: 'Viewpoint',
  address: null,
  lat: 11.95,
  lng: 108.46,
  category: 'viewpoint',
  openingHours: null as string | null,
  source: 'overpass',
};

describe('TripsService.addStop', () => {
  it('snapshots place fields including openingHours and locationId only for db source', async () => {
    const { svc, trips, days, stops, tags, travelLegs } = makeService();
    days.findOne.mockResolvedValue({
      id: 'day-0',
      tripId: 'trip-1',
      date: '2026-08-10',
      dayIndex: 0,
      startTime: null,
    });

    let savedStop: any;
    stops.save.mockImplementation(async (x: any) => {
      if (Array.isArray(x)) return x;
      savedStop = { ...x, id: 'stop-new' };
      return savedStop;
    });

    stops.find
      .mockResolvedValueOnce([]) // siblings before insert
      .mockImplementation(async () => [
        {
          ...savedStop,
          id: 'stop-new',
          travelFromPrevSeconds: 0,
          travelFromPrevDistanceM: 0,
        },
      ]);

    tags.find.mockResolvedValue([]);
    trips.findOne
      .mockResolvedValueOnce(baseTrip())
      .mockResolvedValue(baseTrip({ version: 2 }));
    days.find.mockResolvedValue([
      { id: 'day-0', tripId: 'trip-1', date: '2026-08-10', dayIndex: 0, startTime: null },
    ]);

    const dto: AddStopDto = {
      place: placeDb,
      tripDayId: 'day-0',
      tags: ['entry_point', 'custom'],
      priority: 'must',
    };

    const result = await svc.addStop('user-1', 'trip-1', dto);

    expect(stops.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cafe A',
        address: '1 Hoa Binh',
        lat: String(placeDb.lat),
        lng: String(placeDb.lng),
        category: 'cafe',
        externalPlaceId: placeDb.id,
        openingHoursRaw: 'Mo-Su 08:00-22:00',
        locationId: placeDb.id,
        durationMinutes: 60,
        priority: 'must',
        bufferAfterMinutes: null,
      }),
    );
    expect(tags.create).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'entry_point', isSystem: true }),
    );
    expect(tags.create).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'custom', isSystem: false }),
    );
    expect(travelLegs.recomputeDayLegs).toHaveBeenCalled();
    expect(result.trip).toBeDefined();
    expect(result.trip.version).toBe(2);
    expect(result.trip.days[0].stops[0].schedule).toBeTruthy();
  });

  it('does not set locationId for non-db source', async () => {
    const { svc, trips, days, stops, tags } = makeService();
    trips.findOne.mockResolvedValueOnce(baseTrip()).mockResolvedValue(baseTrip({ version: 2 }));
    days.findOne.mockResolvedValue({
      id: 'day-0',
      tripId: 'trip-1',
      date: '2026-08-10',
      dayIndex: 0,
      startTime: null,
    });
    stops.find.mockResolvedValue([]);
    tags.find.mockResolvedValue([]);
    days.find.mockResolvedValue([
      { id: 'day-0', tripId: 'trip-1', date: '2026-08-10', dayIndex: 0, startTime: null },
    ]);
    stops.save.mockImplementation(async (x: any) =>
      Array.isArray(x) ? x : { ...x, id: 'stop-osm' },
    );

    await svc.addStop('user-1', 'trip-1', {
      place: placeOsm,
      tripDayId: 'day-0',
    });

    expect(stops.create).toHaveBeenCalledWith(
      expect.objectContaining({
        externalPlaceId: 'node/123',
        locationId: null,
        openingHoursRaw: null,
      }),
    );
  });

  it('rejects addStop for another users trip', async () => {
    const { svc, trips } = makeService();
    trips.findOne.mockResolvedValue(baseTrip({ userId: 'other-user' }));

    await expect(
      svc.addStop('user-1', 'trip-1', { place: placeOsm, tripDayId: null }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('TripsService.patchStop', () => {
  it('patches duration and returns schedule without recomputing legs', async () => {
    const { svc, trips, days, stops, tags, travelLegs } = makeService();
    const existing = {
      id: 'stop-1',
      tripId: 'trip-1',
      tripDayId: 'day-0',
      position: 0,
      name: 'Cafe',
      address: null,
      lat: '11.94',
      lng: '108.45',
      category: null,
      externalPlaceId: 'node/1',
      openingHoursRaw: null,
      locationId: null,
      durationMinutes: 60,
      bufferAfterMinutes: null,
      travelModeOverride: null,
      anchorTime: null,
      priority: 'nice',
      status: 'todo',
      travelFromPrevSeconds: 0,
      travelFromPrevDistanceM: 0,
      travelModeUsed: null,
    };

    trips.findOne
      .mockResolvedValueOnce(baseTrip())
      .mockResolvedValue(baseTrip({ version: 2 }));
    stops.findOne.mockResolvedValue({ ...existing });
    stops.save.mockImplementation(async (x: any) => x);
    days.find.mockResolvedValue([
      { id: 'day-0', tripId: 'trip-1', date: '2026-08-10', dayIndex: 0, startTime: null },
    ]);
    stops.find.mockResolvedValue([
      { ...existing, durationMinutes: 90, travelFromPrevSeconds: 0, travelFromPrevDistanceM: 0 },
    ]);
    tags.find.mockResolvedValue([]);

    const result = await svc.patchStop('user-1', 'trip-1', 'stop-1', {
      durationMinutes: 90,
    });

    expect(stops.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'stop-1', durationMinutes: 90 }),
    );
    expect(travelLegs.recomputeDayLegs).not.toHaveBeenCalled();
    expect(result.trip.days[0].stops[0].durationMinutes).toBe(90);
    expect(result.trip.days[0].stops[0].schedule).toBeTruthy();
  });

  it('rejects patchStop for another users trip', async () => {
    const { svc, trips } = makeService();
    trips.findOne.mockResolvedValue(baseTrip({ userId: 'other-user' }));

    await expect(
      svc.patchStop('user-1', 'trip-1', 'stop-1', { durationMinutes: 30 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('TripsService.deleteStop', () => {
  it('deletes stop, renumbers siblings, recomputes legs', async () => {
    const { svc, trips, days, stops, tags, travelLegs } = makeService();
    const stopA = {
      id: 'stop-a',
      tripId: 'trip-1',
      tripDayId: 'day-0',
      position: 0,
      name: 'A',
      address: null,
      lat: '11.94',
      lng: '108.45',
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
      travelFromPrevSeconds: 0,
      travelFromPrevDistanceM: 0,
      travelModeUsed: null,
    };
    const stopB = { ...stopA, id: 'stop-b', position: 1, name: 'B', lat: '11.95', lng: '108.46' };

    trips.findOne.mockResolvedValueOnce(baseTrip()).mockResolvedValue(baseTrip({ version: 2 }));
    stops.findOne.mockResolvedValue({ ...stopA });
    stops.find
      .mockResolvedValueOnce([stopB]) // siblings after delete
      .mockResolvedValueOnce([{ ...stopB, position: 0 }]) // recompute
      .mockResolvedValueOnce([{ ...stopB, position: 0, travelFromPrevSeconds: 0 }]); // findOne
    days.find.mockResolvedValue([
      { id: 'day-0', tripId: 'trip-1', date: '2026-08-10', dayIndex: 0, startTime: null },
    ]);
    tags.find.mockResolvedValue([]);

    const result = await svc.deleteStop('user-1', 'trip-1', 'stop-a');

    expect(stops.remove).toHaveBeenCalledWith(expect.objectContaining({ id: 'stop-a' }));
    expect(travelLegs.recomputeDayLegs).toHaveBeenCalled();
    expect(result.trip.days[0].stops.map((s) => s.id)).toEqual(['stop-b']);
  });

  it('rejects deleteStop for another users trip', async () => {
    const { svc, trips } = makeService();
    trips.findOne.mockResolvedValue(baseTrip({ userId: 'other-user' }));

    await expect(svc.deleteStop('user-1', 'trip-1', 'stop-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

