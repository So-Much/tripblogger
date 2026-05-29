import { LocationEntity } from '../locations/entities/location.entity';
import { TripAccommodationEntity } from './entities/trip-accommodation.entity';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripEntity } from './entities/trip.entity';
import { TripMemberEntity } from './entities/trip-member.entity';
import { TripStopEntity } from './entities/trip-stop.entity';

export function mapLocation(loc: LocationEntity | null | undefined) {
  if (!loc) return null;
  return {
    id: loc.id,
    name: loc.name,
    address: loc.address,
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    avgRating: Number(loc.avgRating),
    locationType: loc.locationType
      ? { code: loc.locationType.code, name: loc.locationType.name, icon: loc.locationType.icon }
      : null,
  };
}

export function mapStop(stop: TripStopEntity) {
  return {
    id: stop.id,
    tripDayId: stop.tripDayId,
    location: mapLocation(stop.location),
    customName: stop.customName,
    customAddress: stop.customAddress,
    customLatitude: stop.customLatitude ? Number(stop.customLatitude) : null,
    customLongitude: stop.customLongitude ? Number(stop.customLongitude) : null,
    orderIndex: stop.orderIndex,
    arrivalTime: stop.arrivalTime,
    departureTime: stop.departureTime,
    durationMinutes: stop.durationMinutes,
    status: stop.status,
    transportMode: stop.transportMode,
    distanceFromPrevKm: stop.distanceFromPrevKm ? Number(stop.distanceFromPrevKm) : null,
    estimatedTravelMin: stop.estimatedTravelMin,
    budgetEstimate: stop.budgetEstimate ? Number(stop.budgetEstimate) : null,
    actualSpent: stop.actualSpent ? Number(stop.actualSpent) : null,
    notes: stop.notes,
    visitedAt: stop.visitedAt,
    updatedAt: stop.updatedAt,
  };
}

export function mapDay(day: TripDayEntity) {
  return {
    id: day.id,
    date: day.date,
    dayNumber: day.dayNumber,
    title: day.title,
    theme: day.theme,
    notes: day.notes,
    totalDistanceKm: day.totalDistanceKm ? Number(day.totalDistanceKm) : null,
    stops: (day.stops ?? []).sort((a, b) => a.orderIndex - b.orderIndex).map(mapStop),
  };
}

export function mapMember(m: TripMemberEntity) {
  return {
    id: m.id,
    userId: m.userId,
    role: m.role,
    status: m.status,
    note: m.note,
    joinedAt: m.joinedAt,
    username: m.user?.memberProfile?.username ?? null,
  };
}

export function mapAccommodation(a: TripAccommodationEntity) {
  return {
    id: a.id,
    location: mapLocation(a.location),
    customName: a.customName,
    customAddress: a.customAddress,
    checkIn: a.checkIn,
    checkOut: a.checkOut,
    roomType: a.roomType,
    pricePerNight: a.pricePerNight ? Number(a.pricePerNight) : null,
    priceCurrency: a.priceCurrency,
    isPrimary: a.isPrimary,
    notes: a.notes,
  };
}

export function mapTrip(
  trip: TripEntity & { accommodations?: TripAccommodationEntity[] },
  includeRelations = true,
) {
  const base = {
    id: trip.id,
    userId: trip.userId,
    title: trip.title,
    description: trip.description,
    destinationName: trip.destinationName,
    startDate: trip.startDate,
    endDate: trip.endDate,
    status: trip.status,
    isPublic: trip.isPublic,
    totalBudget: trip.totalBudget ? Number(trip.totalBudget) : null,
    actualBudget: trip.actualBudget ? Number(trip.actualBudget) : null,
    notes: trip.notes,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  };
  if (!includeRelations) return base;
  return {
    ...base,
    days: (trip.days ?? []).sort((a, b) => a.dayNumber - b.dayNumber).map(mapDay),
    members: (trip.members ?? []).map(mapMember),
    accommodations: (trip.accommodations ?? []).map(mapAccommodation),
  };
}
