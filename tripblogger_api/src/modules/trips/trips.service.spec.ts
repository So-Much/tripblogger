import { NotFoundException } from '@nestjs/common';
import { TripsService } from './trips.service';
import type { CreateTripDto } from './dto/create-trip.dto';

type MockRepo = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
};

function makeRepo(): MockRepo {
  return {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
  };
}

function makeService(repos?: {
  trips?: MockRepo;
  days?: MockRepo;
  stops?: MockRepo;
  tags?: MockRepo;
}) {
  const trips = repos?.trips ?? makeRepo();
  const days = repos?.days ?? makeRepo();
  const stops = repos?.stops ?? makeRepo();
  const tags = repos?.tags ?? makeRepo();
  const svc = new TripsService(trips as any, days as any, stops as any, tags as any);
  return { svc, trips, days, stops, tags };
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
