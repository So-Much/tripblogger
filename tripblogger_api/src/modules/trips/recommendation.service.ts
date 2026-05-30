import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationEntity } from '../locations/entities/location.entity';
import { TripAccommodationEntity } from './entities/trip-accommodation.entity';
import { TripRecommendationEntity } from './entities/trip-recommendation.entity';
import { TripEntity } from './entities/trip.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { haversineKm } from '../../common/utils/haversine';
import { computeRecommendationScore } from './utils/trip-scoring';
import { TripsRealtimeBroadcastService } from './trips-realtime-broadcast.service';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(TripRecommendationEntity)
    private readonly recRepo: Repository<TripRecommendationEntity>,
    @InjectRepository(TripEntity)
    private readonly tripsRepo: Repository<TripEntity>,
    @InjectRepository(TripAccommodationEntity)
    private readonly accomRepo: Repository<TripAccommodationEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
    private readonly permissions: TripPermissionsService,
    private readonly realtime: TripsRealtimeBroadcastService,
  ) {}

  async list(tripId: string, userId: string, category?: string, limit = 20) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const qb = this.recRepo
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.location', 'l')
      .leftJoinAndSelect('l.locationType', 'lt')
      .where('r.trip_id = :tripId', { tripId })
      .andWhere('r.is_dismissed = 0')
      .orderBy('r.score', 'DESC')
      .take(limit);
    if (category) qb.andWhere('lt.code = :category', { category });
    const rows = await qb.getMany();
    return rows.map((r) => ({
      id: r.id,
      score: Number(r.score),
      distanceKm: r.distanceKm ? Number(r.distanceKm) : null,
      isAdded: r.isAdded,
      location: {
        id: r.location.id,
        name: r.location.name,
        address: r.location.address,
        latitude: Number(r.location.latitude),
        longitude: Number(r.location.longitude),
        avgRating: Number(r.location.avgRating),
        locationType: r.location.locationType
          ? { code: r.location.locationType.code, name: r.location.locationType.name }
          : null,
      },
    }));
  }

  async generate(tripId: string, accommodationId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const accom = await this.accomRepo.findOne({
      where: { id: accommodationId, tripId },
      relations: ['location'],
    });
    if (!accom) throw new NotFoundException('Accommodation not found');

    const { lat, lng } = this.accomCoords(accom);
    if (lat == null || lng == null) throw new NotFoundException('Accommodation has no coordinates');

    const trip = await this.tripsRepo.findOne({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    const days = Math.max(
      1,
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000 + 1,
    );
    const tripDailyBudget = trip.totalBudget ? Number(trip.totalBudget) / days : null;

    const candidates = await this.locationsRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.locationType', 'lt')
      .where('l.status = :status', { status: 'ACTIVE' })
      .getMany();

    const excluded = await this.getExcludedLocationIds(tripId);
    const categoryCounts = await this.getCategoryCounts(tripId);

    const scored: { loc: LocationEntity; score: number; distanceKm: number }[] = [];
    for (const loc of candidates) {
      if (excluded.has(loc.id)) continue;
      const lat2 = Number(loc.latitude);
      const lng2 = Number(loc.longitude);
      const distanceKm = haversineKm(lat, lng, lat2, lng2);
      if (distanceKm > 10) continue;
      const typeCode = loc.locationType?.code ?? 'other';
      const score = computeRecommendationScore({
        distanceKm,
        avgRating: Number(loc.avgRating),
        totalReview: loc.totalReview,
        popularityScore: Number(loc.popularityScore),
        categoryAlreadyInTrip: categoryCounts.get(typeCode) ?? 0,
        priceLevel: loc.priceLevel,
        tripDailyBudget,
        lastReviewMonthsAgo: null,
      });
      scored.push({ loc, score, distanceKm });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 50);

    await this.recRepo.delete({ tripId, isDismissed: false, isAdded: false });

    for (const item of top) {
      await this.recRepo.save(
        this.recRepo.create({
          tripId,
          locationId: item.loc.id,
          basedOnAccommodationId: accommodationId,
          score: String(item.score.toFixed(4)),
          distanceKm: String(item.distanceKm.toFixed(2)),
          recommendationBasisJson: JSON.stringify({ distanceKm: item.distanceKm }),
          isDismissed: false,
          isAdded: false,
          generatedAt: new Date(),
        }),
      );
    }

    this.realtime.emitRecommendationsReady(tripId, top.length);
    return { count: top.length };
  }

  async refresh(tripId: string, userId: string) {
    const primary = await this.accomRepo.findOne({
      where: { tripId, isPrimary: true },
    });
    if (!primary) throw new NotFoundException('No primary accommodation');
    return this.generate(tripId, primary.id, userId);
  }

  async dismiss(tripId: string, recId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    await this.recRepo.update({ id: recId, tripId }, { isDismissed: true });
    return { dismissed: true };
  }

  async markAdded(tripId: string, recId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    await this.recRepo.update({ id: recId, tripId }, { isAdded: true });
    return { added: true };
  }

  private accomCoords(accom: TripAccommodationEntity): { lat: number | null; lng: number | null } {
    if (accom.location) {
      return { lat: Number(accom.location.latitude), lng: Number(accom.location.longitude) };
    }
    if (accom.customLatitude && accom.customLongitude) {
      return { lat: Number(accom.customLatitude), lng: Number(accom.customLongitude) };
    }
    return { lat: null, lng: null };
  }

  private async getExcludedLocationIds(tripId: string): Promise<Set<string>> {
    const stopRows = await this.recRepo.manager.query(
      `SELECT DISTINCT ts.location_id AS id FROM trip_stops ts
       INNER JOIN trip_days td ON td.id = ts.trip_day_id
       WHERE td.trip_id = @0 AND ts.location_id IS NOT NULL`,
      [tripId],
    );
    const accomRows = await this.recRepo.manager.query(
      `SELECT DISTINCT location_id AS id FROM trip_accommodations WHERE trip_id = @0 AND location_id IS NOT NULL`,
      [tripId],
    );
    const dismissed = await this.recRepo.find({
      where: { tripId, isDismissed: true },
      select: ['locationId'],
    });
    const set = new Set<string>();
    for (const r of [...stopRows, ...accomRows]) if (r.id) set.add(r.id);
    for (const d of dismissed) set.add(d.locationId);
    return set;
  }

  private async getCategoryCounts(tripId: string): Promise<Map<string, number>> {
    const rows = await this.recRepo.manager.query(
      `SELECT lt.code, COUNT(*) AS cnt FROM trip_stops ts
       INNER JOIN trip_days td ON td.id = ts.trip_day_id
       INNER JOIN locations l ON l.id = ts.location_id
       LEFT JOIN location_types lt ON lt.id = l.location_type_id
       WHERE td.trip_id = @0
       GROUP BY lt.code`,
      [tripId],
    );
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.code ?? 'other', Number(r.cnt));
    return map;
  }
}
