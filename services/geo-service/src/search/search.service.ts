import {
  isOpenNow,
  normalizeVi,
  rankPlaces,
  type MapPlaceDto,
  type PlaceDetailDto,
  type PlaceReviewDto,
  type RankInput,
} from '@tripblogger/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { PlaceEntity } from '../entities/place.entity';
import { PlaceReviewEntity } from '../entities/place-review.entity';
import { TypesensePlaces } from './typesense.client';

export const REVERSE_SNAP_RADIUS_M = 50;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(PlaceEntity) private readonly places: Repository<PlaceEntity>,
    @InjectRepository(PlaceReviewEntity) private readonly reviews: Repository<PlaceReviewEntity>,
    private readonly typesense: TypesensePlaces,
  ) {}

  async search(
    q: string,
    origin?: { lat?: number; lng?: number },
    bias?: { lat?: number; lng?: number },
    limit = 15,
  ): Promise<{ places: MapPlaceDto[]; degraded: boolean }> {
    const biasPoint =
      bias?.lat != null && bias.lng != null
        ? { lat: bias.lat, lng: bias.lng }
        : origin?.lat != null && origin.lng != null
          ? { lat: origin.lat, lng: origin.lng }
          : null;
    let degraded = false;
    let rows: PlaceEntity[] = [];
    try {
      const ids = await this.typesense.searchIds(q, biasPoint, Math.min(40, limit * 3));
      if (ids.length) {
        rows = await this.places.find({ where: ids.map((id) => ({ id, status: 'active' as const })) });
      }
    } catch (err) {
      degraded = true;
      this.logger.warn(`Typesense down, SQL fallback: ${err instanceof Error ? err.message : err}`);
      const needle = `%${normalizeVi(q)}%`;
      rows = await this.places.find({
        where: [
          { status: 'active', normalizedName: Like(needle) },
          { status: 'active', address: Like(needle) },
        ],
        take: 40,
      });
    }
    const ranked = rankPlaces(
      q,
      rows.map((p) => this.toRank(p)),
      biasPoint,
    ).slice(0, limit);
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      degraded,
      places: ranked.map((r) => this.toDto(byId.get(r.id)!, origin)),
    };
  }

  async nearby(
    lat: number,
    lng: number,
    category: string,
    radius = 1500,
    limit = 40,
  ): Promise<MapPlaceDto[]> {
    try {
      const ids = await this.typesense.nearbyIds(lat, lng, category, radius, limit);
      if (ids.length) {
        const rows = await this.places.find({ where: ids.map((id) => ({ id })) });
        return rows.map((p) => this.toDto(p, { lat, lng }));
      }
    } catch (err) {
      this.logger.warn(`Typesense nearby fallback: ${err instanceof Error ? err.message : err}`);
    }
    const all = await this.places.find({ where: { status: 'active', category }, take: 500 });
    return all
      .map((p) => this.toDto(p, { lat, lng }))
      .filter((p) => p.distanceM != null && p.distanceM <= radius)
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
      .slice(0, limit);
  }

  async getById(id: string): Promise<PlaceEntity | null> {
    return this.places.findOne({ where: { id } });
  }

  async getDetail(id: string): Promise<PlaceDetailDto | null> {
    const place = await this.places.findOne({ where: { id, status: 'active' } });
    if (!place) return null;
    const rows = await this.reviews.find({
      where: { placeId: id },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const reviewDtos: PlaceReviewDto[] = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    }));
    return {
      ...this.toDto(place),
      reviews: reviewDtos,
      isOpenNow: isOpenNow(place.openingHoursRaw),
    };
  }

  /**
   * Nearest active place within radiusM (haversine). Prefer Typesense geo filter, SQL fallback.
   */
  async nearestWithin(lat: number, lng: number, radiusM = REVERSE_SNAP_RADIUS_M): Promise<MapPlaceDto | null> {
    try {
      const ids = await this.typesense.nearbyIdsAnyCategory(lat, lng, radiusM, 5);
      if (ids.length) {
        const rows = await this.places.find({ where: ids.map((id) => ({ id, status: 'active' as const })) });
        const ranked = rows
          .map((p) => this.toDto(p, { lat, lng }))
          .filter((p) => p.distanceM != null && p.distanceM <= radiusM)
          .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
        if (ranked[0]) return ranked[0];
      }
    } catch (err) {
      this.logger.warn(`Typesense nearestWithin fallback: ${err instanceof Error ? err.message : err}`);
    }
    const candidates = await this.places.find({ where: { status: 'active' }, take: 800 });
    const ranked = candidates
      .map((p) => this.toDto(p, { lat, lng }))
      .filter((p) => p.distanceM != null && p.distanceM <= radiusM)
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
    return ranked[0] ?? null;
  }

  toDto(place: PlaceEntity, origin?: { lat?: number; lng?: number }): MapPlaceDto {
    const plat = Number(place.lat);
    const plng = Number(place.lng);
    return {
      id: place.id,
      name: place.name,
      address: place.address,
      lat: plat,
      lng: plng,
      category: place.category,
      source: 'db',
      distanceM:
        origin?.lat != null && origin.lng != null ? Math.round(haversineM(origin.lat, origin.lng, plat, plng)) : null,
      rating: Number(place.ratingAvg) || null,
      reviewCount: place.reviewCount || null,
      openingHours: place.openingHoursRaw,
      phone: place.phone,
      website: place.website,
      imageUrl: place.imageUrl,
    };
  }

  private toRank(place: PlaceEntity): RankInput {
    return {
      id: place.id,
      name: place.name,
      address: place.address,
      source: 'db',
      rating: Number(place.ratingAvg) || null,
      lat: Number(place.lat),
      lng: Number(place.lng),
    };
  }
}

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
