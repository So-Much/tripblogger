import { Inject, Injectable, Logger } from '@nestjs/common';
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

export type MapPlaceDto = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  source: 'db' | 'overpass' | 'photon' | 'nominatim';
  distanceM: number | null;
  rating: number | null;
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
    const cacheKey = `map:nearby:${categoryId}:${hash}:${Math.round(radiusM / 100)}`;

    const cached = await this.cacheGet<MapPlaceDto[]>(cacheKey);
    if (cached) return cached.slice(0, limit);

    const radiusKm = radiusM / 1000;
    const dbPlaces = await this.queryDbNearby(lat, lng, radiusKm, category.dbTypeCodes, limit);
    const need = Math.max(0, limit - dbPlaces.length);
    const overpassPlaces =
      need > 0 ? await this.overpass.nearby(lat, lng, radiusM, category, need + 10) : [];

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
      })),
    ]);

    merged.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
    const result = merged.slice(0, limit);
    await this.cacheSet(cacheKey, result, NEARBY_TTL_S);
    return result;
  }

  async search(q: string, lat?: number, lng?: number, limit = 15): Promise<MapPlaceDto[]> {
    const trimmed = q.trim();
    if (trimmed.length < 2) return [];
    const cacheKey = `map:search:${trimmed.toLowerCase()}:${lat?.toFixed(2) ?? ''}:${lng?.toFixed(2) ?? ''}:${limit}`;
    const cached = await this.cacheGet<MapPlaceDto[]>(cacheKey);
    if (cached) return cached;

    const qb = this.locationsRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.locationType', 'lt')
      .where('l.status = :status', { status: 'ACTIVE' })
      .andWhere('(LOWER(l.name) LIKE :q OR LOWER(l.address) LIKE :q)', {
        q: `%${trimmed.toLowerCase()}%`,
      })
      .take(limit);
    const dbRows = await qb.getMany();
    const dbPlaces: MapPlaceDto[] = dbRows.map((loc) => {
      const plat = Number(loc.latitude);
      const plng = Number(loc.longitude);
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
        rating: Number(loc.avgRating) || null,
      };
    });

    let external: MapPlaceDto[] = [];
    try {
      const places = await this.placesService.search(trimmed, lat, lng, Math.max(8, limit - dbPlaces.length));
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
      }));
    } catch (err) {
      this.logger.warn(`Places search failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const merged = this.dedupePlaces([...dbPlaces, ...external]);
    if (lat != null && lng != null) {
      merged.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
    }
    const result = merged.slice(0, limit);
    await this.cacheSet(cacheKey, result, SEARCH_TTL_S);
    return result;
  }

  async reverse(lat: number, lng: number): Promise<MapPlaceDto | null> {
    try {
      const results = await this.placesService.reverse(lat, lng);
      const first = results[0];
      if (!first) return null;
      return {
        id: first.id,
        name: first.name,
        address: first.address ?? null,
        lat: first.lat,
        lng: first.lng,
        category: null,
        source: first.source,
        distanceM: 0,
        rating: null,
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
        return {
          id: loc.id,
          name: loc.name,
          address: loc.address,
          lat: plat,
          lng: plng,
          category: loc.locationType?.code ?? null,
          source: 'db' as const,
          distanceM,
          rating: Number(loc.avgRating) || null,
        };
      })
      .filter((p) => (p.distanceM ?? Infinity) <= radiusKm * 1000)
      .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
      .slice(0, limit);
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
