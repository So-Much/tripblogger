import { BadGatewayException, HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { REDIS_CLIENT } from '../../config/redis/redis.module';
import { haversineKm } from '../../common/utils/haversine';
import { PlacesService } from '../places/places.service';
import { LocationEntity } from '../locations/entities/location.entity';
import {
  isPoiCategoryId,
  POI_CATEGORIES,
  PoiCategoryId,
} from './constants/poi-categories';
import { OverpassProvider } from './providers/overpass.provider';
import { OsrmProvider, TravelMode } from './providers/osrm.provider';
import { encodeGeohash } from './utils/geohash';
import { rankPlaces } from './utils/search-ranking';

export type MapPlaceDto = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  source: 'db' | 'overpass' | 'photon' | 'nominatim';
  distanceM: number | null;
  /** TripBlogger location_reviews average; null for OSM/external POIs. */
  rating: number | null;
  /** TripBlogger review count; null when unknown or zero. */
  reviewCount: number | null;
};

const NEARBY_TTL_S = 7 * 24 * 60 * 60;
const ROUTE_TTL_S = 6 * 60 * 60;
const SEARCH_TTL_S = 24 * 60 * 60;

@Injectable()
export class MapService {
  private readonly logger = new Logger(MapService.name);

  constructor(
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
    private readonly placesService: PlacesService,
    private readonly overpass: OverpassProvider,
    private readonly osrm: OsrmProvider,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async nearby(
    lat: number,
    lng: number,
    categoryId: string,
    radiusM = 1500,
    limit = 40,
  ): Promise<MapPlaceDto[]> {
    if (!isPoiCategoryId(categoryId)) return [];
    const category = POI_CATEGORIES[categoryId];
    const hash = encodeGeohash(lat, lng, 6);
    // v4: do not cache Overpass soft-fail empties (v3 poisoned some keys)
    const cacheKey = `map:nearby:v4:${categoryId}:${hash}:${Math.round(radiusM / 100)}`;

    const cached = await this.cacheGet<MapPlaceDto[]>(cacheKey);
    if (cached) return cached.slice(0, limit);

    const radiusKm = radiusM / 1000;
    // Over-fetch slightly so haversine shortlist can be re-ranked by road distance.
    const candidateLimit = Math.min(limit + 15, 80);
    const dbPlaces = await this.queryDbNearby(
      lat,
      lng,
      radiusKm,
      category.dbTypeCodes,
      candidateLimit,
    );
    const need = Math.max(0, candidateLimit - dbPlaces.length);
    let overpassPlaces: Awaited<ReturnType<OverpassProvider['nearby']>> = [];
    let overpassOk = true;
    if (need > 0) {
      try {
        overpassPlaces = await this.overpass.nearby(lat, lng, radiusM, category, need + 10);
      } catch (err) {
        overpassOk = false;
        this.logger.warn(
          `Overpass nearby failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        // No DB fallback → surface as error so the client can retry.
        if (dbPlaces.length === 0) {
          throw new BadGatewayException('Nearby places temporarily unavailable');
        }
      }
    }

    const merged = this.dedupePlaces([
      ...dbPlaces,
      ...overpassPlaces.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address ?? null,
        lat: p.lat,
        lng: p.lng,
        category: categoryId,
        source: 'overpass' as const,
        distanceM: Math.round(haversineKm(lat, lng, p.lat, p.lng) * 1000),
        rating: null,
        reviewCount: null,
      })),
    ]);

    // Sort/filter candidates by crow-flies, then replace displayed distance with road meters.
    merged.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
    const shortlist = merged.slice(0, candidateLimit);
    const withRoad = await this.applyRoadDistances(lat, lng, shortlist);
    withRoad.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
    const result = withRoad.slice(0, limit);
    // Only cache complete successes (including genuine empty from Overpass).
    if (overpassOk) {
      await this.cacheSet(cacheKey, result, NEARBY_TTL_S);
    }
    return result;
  }

  async search(
    q: string,
    lat?: number,
    lng?: number,
    limit = 15,
    biasLat?: number,
    biasLng?: number,
  ): Promise<MapPlaceDto[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];

    const bias =
      biasLat != null && biasLng != null
        ? { lat: biasLat, lng: biasLng }
        : lat != null && lng != null
          ? { lat, lng }
          : null;

    // v4: composite ranking (text + bias distance + source + rating); bias in key.
    const cacheKey = `map:search:v4:${trimmed.toLowerCase()}:${lat?.toFixed(2) ?? ''}:${lng?.toFixed(2) ?? ''}:${bias ? `${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}` : ''}:${limit}`;
    const cached = await this.cacheGet<MapPlaceDto[]>(cacheKey);
    if (cached) return cached;

    // Accent-insensitive recall (SQL Server collation) across name/address.
    const qb = this.locationsRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.locationType', 'lt')
      .where('l.status = :status', { status: 'ACTIVE' })
      .andWhere(
        '(l.name COLLATE Latin1_General_CI_AI LIKE :q OR l.address COLLATE Latin1_General_CI_AI LIKE :q)',
        { q: `%${trimmed}%` },
      )
      .take(Math.max(limit * 2, 30));
    const dbRows = await qb.getMany();
    const dbPlaces: MapPlaceDto[] = dbRows.map((loc) => {
      const plat = Number(loc.latitude);
      const plng = Number(loc.longitude);
      const { rating, reviewCount } = this.dbRatingFields(loc);
      return {
        id: loc.id,
        name: loc.name,
        address: loc.address,
        lat: plat,
        lng: plng,
        category: loc.locationType?.code ?? null,
        source: 'db' as const,
        distanceM:
          lat != null && lng != null ? Math.round(haversineKm(lat, lng, plat, plng) * 1000) : null,
        rating,
        reviewCount,
      };
    });

    let external: MapPlaceDto[] = [];
    let externalOk = true;
    try {
      // Photon bias uses the viewport center when available.
      const places = await this.placesService.search(
        trimmed,
        bias?.lat ?? lat,
        bias?.lng ?? lng,
        Math.max(8, limit - dbPlaces.length),
      );
      external = places.map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address ?? null,
        lat: p.lat,
        lng: p.lng,
        category: null,
        source: p.source,
        distanceM:
          lat != null && lng != null
            ? Math.round(haversineKm(lat, lng, p.lat, p.lng) * 1000)
            : null,
        rating: null,
        reviewCount: null,
      }));
    } catch (err) {
      externalOk = false;
      this.logger.warn(`Places search failed: ${err instanceof Error ? err.message : String(err)}`);
      // No DB hits → let the client retry instead of caching a false empty.
      if (dbPlaces.length === 0) {
        if (err instanceof HttpException) throw err;
        throw new BadGatewayException('Places search temporarily unavailable');
      }
    }

    const merged = this.dedupePlaces([...dbPlaces, ...external]);
    // Composite ranking replaces the old distance-only sort.
    let result = rankPlaces(trimmed, merged, bias).slice(0, limit);
    if (lat != null && lng != null) {
      // Displayed distance stays GPS-origin road distance; ranking order is preserved.
      result = await this.applyRoadDistances(lat, lng, result);
    }
    if (externalOk) {
      await this.cacheSet(cacheKey, result, SEARCH_TTL_S);
    }
    return result;
  }

  async reverse(
    lat: number,
    lng: number,
    fromLat?: number,
    fromLng?: number,
  ): Promise<MapPlaceDto | null> {
    try {
      const results = await this.placesService.reverse(lat, lng);
      const first = results[0];
      if (!first) return null;
      let distanceM: number | null = null;
      if (fromLat != null && fromLng != null) {
        const [road] = await this.osrm.tableDistances(fromLat, fromLng, [
          { lat: first.lat, lng: first.lng },
        ]);
        distanceM =
          road ?? Math.round(haversineKm(fromLat, fromLng, first.lat, first.lng) * 1000);
      }
      return {
        id: first.id,
        name: first.name,
        address: first.address ?? null,
        lat: first.lat,
        lng: first.lng,
        category: null,
        source: first.source,
        distanceM,
        rating: null,
        reviewCount: null,
      };
    } catch (err) {
      this.logger.warn(`Reverse failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async route(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    mode: TravelMode = 'car',
    alternatives = true,
  ) {
    const round = (n: number) => Math.round(n * 10000) / 10000;
    const cacheKey = `map:route:${mode}:${round(fromLat)},${round(fromLng)}:${round(toLat)},${round(toLng)}:${alternatives ? 1 : 0}`;
    const cached = await this.cacheGet(cacheKey);
    if (cached) return cached;

    const routes = await this.osrm.route(fromLat, fromLng, toLat, toLng, mode, alternatives);
    const payload = { routes, mode };
    if (routes.length) await this.cacheSet(cacheKey, payload, ROUTE_TTL_S);
    return payload;
  }

  categories() {
    return (Object.keys(POI_CATEGORIES) as PoiCategoryId[]).map((id) => ({
      id,
      labelVi: POI_CATEGORIES[id].labelVi,
      labelEn: POI_CATEGORIES[id].labelEn,
    }));
  }

  private async queryDbNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    typeCodes: string[],
    limit: number,
  ): Promise<MapPlaceDto[]> {
    const qb = this.locationsRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.locationType', 'lt')
      .where('l.status = :status', { status: 'ACTIVE' });
    if (typeCodes.length) {
      qb.andWhere('lt.code IN (:...codes)', { codes: typeCodes });
    }
    const rows = await qb.getMany();
    return rows
      .map((loc) => {
        const plat = Number(loc.latitude);
        const plng = Number(loc.longitude);
        const distanceM = Math.round(haversineKm(lat, lng, plat, plng) * 1000);
        const { rating, reviewCount } = this.dbRatingFields(loc);
        return {
          id: loc.id,
          name: loc.name,
          address: loc.address,
          lat: plat,
          lng: plng,
          category: loc.locationType?.code ?? null,
          source: 'db' as const,
          distanceM,
          rating,
          reviewCount,
        };
      })
      .filter((p) => (p.distanceM ?? Infinity) <= radiusKm * 1000)
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
      .slice(0, limit);
  }

  /** Only expose real TripBlogger aggregates — never invent 0-star placeholders. */
  private dbRatingFields(loc: LocationEntity): {
    rating: number | null;
    reviewCount: number | null;
  } {
    const rating = Number(loc.avgRating);
    const reviewCount = Number(loc.totalReview) || 0;
    return {
      rating: rating > 0 ? rating : null,
      reviewCount: reviewCount > 0 ? reviewCount : null,
    };
  }

  /**
   * Replace haversine distanceM with OSRM car road distance for the visible list.
   * Falls back to existing (haversine) values when table lookup fails for a point.
   */
  private async applyRoadDistances(
    fromLat: number,
    fromLng: number,
    places: MapPlaceDto[],
  ): Promise<MapPlaceDto[]> {
    if (!places.length) return places;
    const roadMeters = await this.osrm.tableDistances(
      fromLat,
      fromLng,
      places.map((p) => ({ lat: p.lat, lng: p.lng })),
      'car',
    );
    return places.map((place, i) => ({
      ...place,
      distanceM: roadMeters[i] ?? place.distanceM,
    }));
  }

  /** Prefer DB entries; drop duplicates within ~50m with similar names. */
  private dedupePlaces(places: MapPlaceDto[]): MapPlaceDto[] {
    const out: MapPlaceDto[] = [];
    for (const place of places) {
      const dup = out.find((existing) => {
        const sameName =
          existing.name.trim().toLowerCase() === place.name.trim().toLowerCase();
        const distM =
          haversineKm(existing.lat, existing.lng, place.lat, place.lng) * 1000;
        return sameName && distM < 50;
      });
      if (dup) {
        if (dup.source !== 'db' && place.source === 'db') {
          const idx = out.indexOf(dup);
          out[idx] = place;
        }
        continue;
      }
      out.push(place);
    }
    return out;
  }

  private async cacheGet<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private async cacheSet(key: string, value: unknown, ttlS: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlS);
    } catch (err) {
      this.logger.warn(`Redis set failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
