import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceResultDto } from '../places/dto/place.dto';
import { PlacesService } from '../places/places.service';
import { SavedLocationEntity } from '../trips/entities/saved-location.entity';
import { CreateLocationDto, UpsertFromPlaceDto } from './dto/create-location.dto';
import { LocationEntity } from './entities/location.entity';
import { LocationMediaEntity } from './entities/location-media.entity';
import { LocationTypeEntity } from './entities/location-type.entity';
import { LocationReviewsService } from './location-reviews.service';
import { haversineKm } from '../../common/utils/haversine';

export type LocationResponse = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  status: string;
  locationType: { id: string; code: string; name: string; icon: string | null } | null;
  avgRating: number;
  totalReview: number;
};

export type LocationDetailResponse = LocationResponse & {
  phone: string | null;
  website: string | null;
  priceLevel: number | null;
  openHours: unknown | null;
  savedByMe: boolean;
  savedLocationId: string | null;
  hasMyReview: boolean;
};

export type LocationMediaItem = {
  id: string;
  mediaId: string;
  url: string;
  thumbnailUrl: string | null;
  aestheticScore: number | null;
  isPrimary: boolean;
};

export type NearbyLocationResponse = LocationResponse & { distanceKm: number };

function parseNearbyTypeCodes(typeCode?: string, typeCodes?: string): string[] {
  const fromCsv =
    typeCodes
      ?.split(',')
      .map((c) => c.trim())
      .filter(Boolean) ?? [];
  if (fromCsv.length > 0) return [...new Set(fromCsv)];
  const single = typeCode?.trim();
  return single ? [single] : [];
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
    @InjectRepository(LocationTypeEntity)
    private readonly typesRepo: Repository<LocationTypeEntity>,
    @InjectRepository(LocationMediaEntity)
    private readonly locationMediaRepo: Repository<LocationMediaEntity>,
    @InjectRepository(SavedLocationEntity)
    private readonly savedRepo: Repository<SavedLocationEntity>,
    private readonly placesService: PlacesService,
    private readonly reviewsService: LocationReviewsService,
  ) {}

  async search(
    q: string,
    typeCode?: string,
    lat?: number,
    lng?: number,
    limit = 20,
  ): Promise<LocationResponse[]> {
    const qb = this.locationsRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.locationType', 'lt')
      .where('l.status = :status', { status: 'ACTIVE' })
      .andWhere('l.name LIKE :q', { q: `%${q}%` })
      .orderBy('l.popularity_score', 'DESC')
      .take(Math.min(limit, 50));

    if (typeCode) {
      qb.andWhere('lt.code = :typeCode', { typeCode });
    }

    const dbResults = await qb.getMany();
    const mapped = dbResults.map((l) => this.toResponse(l));

    if (mapped.length >= limit) {
      return mapped;
    }

    let places: PlaceResultDto[] = [];
    try {
      places = await this.placesService.search(q, lat, lng, limit - mapped.length);
    } catch {
      return mapped;
    }
    const externalIds = new Set(
      places.map((p) => `${p.source}:${p.id}`),
    );
    const existingExternal =
      places.length > 0
        ? await this.locationsRepo
            .createQueryBuilder('l')
            .where(
              places
                .map((_, i) => `(l.external_source = :src${i} AND l.external_id = :eid${i})`)
                .join(' OR '),
              Object.fromEntries(
                places.flatMap((p, i) => [
                  [`src${i}`, p.source],
                  [`eid${i}`, p.id],
                ]),
              ),
            )
            .getMany()
        : [];
    const existingSet = new Set(
      existingExternal.map((e) => `${e.externalSource}:${e.externalId}`),
    );

    const placeExtras: LocationResponse[] = [];
    for (const p of places) {
      const key = `${p.source}:${p.id}`;
      if (existingSet.has(key)) continue;
      if (externalIds.has(key) && mapped.some((m) => m.name === p.name)) continue;
      placeExtras.push({
        id: `external:${p.source}:${p.id}`,
        name: p.name,
        address: p.address ?? null,
        latitude: p.lat,
        longitude: p.lng,
        status: 'EXTERNAL',
        locationType: null,
        avgRating: 0,
        totalReview: 0,
      });
    }

    return [...mapped, ...placeExtras].slice(0, limit);
  }

  async nearby(
    lat: number,
    lng: number,
    radiusKm = 10,
    sort: 'rating' | 'popularity' = 'rating',
    limit = 30,
    typeCode?: string,
    typeCodes?: string,
  ): Promise<NearbyLocationResponse[]> {
    const cap = Math.min(limit, 50);
    const codes = parseNearbyTypeCodes(typeCode, typeCodes);
    const qb = this.locationsRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.locationType', 'lt')
      .where('l.status = :status', { status: 'ACTIVE' });
    if (codes.length > 0) {
      qb.andWhere('lt.code IN (:...codes)', { codes });
    }
    const rows = await qb.getMany();

    const within = rows
      .map((loc) => {
        const lat2 = Number(loc.latitude);
        const lng2 = Number(loc.longitude);
        const distanceKm = haversineKm(lat, lng, lat2, lng2);
        return { loc, distanceKm };
      })
      .filter(({ distanceKm }) => distanceKm <= radiusKm);

    if (sort === 'popularity') {
      within.sort(
        (a, b) =>
          Number(b.loc.popularityScore) - Number(a.loc.popularityScore) ||
          a.distanceKm - b.distanceKm,
      );
    } else {
      within.sort(
        (a, b) =>
          Number(b.loc.avgRating) - Number(a.loc.avgRating) ||
          b.loc.totalReview - a.loc.totalReview ||
          a.distanceKm - b.distanceKm,
      );
    }

    const results: NearbyLocationResponse[] = within.slice(0, cap).map(({ loc, distanceKm }) => ({
      ...this.toResponse(loc),
      distanceKm: Math.round(distanceKm * 100) / 100,
    }));

    if (results.length >= cap || codes.length > 0) {
      return results;
    }

    try {
      const places = await this.placesService.nearby(lat, lng, cap - results.length);
      const seenNames = new Set(results.map((r) => r.name.toLowerCase()));

      for (const p of places) {
        const distanceKm = haversineKm(lat, lng, p.lat, p.lng);
        if (distanceKm > radiusKm) continue;
        const key = p.name.toLowerCase();
        if (seenNames.has(key)) continue;
        seenNames.add(key);
        results.push({
          id: `external:${p.source}:${p.id}`,
          name: p.name,
          address: p.address ?? null,
          latitude: p.lat,
          longitude: p.lng,
          status: 'EXTERNAL',
          locationType: null,
          avgRating: 0,
          totalReview: 0,
          distanceKm: Math.round(distanceKm * 100) / 100,
        });
        if (results.length >= cap) break;
      }

      if (sort === 'rating') {
        results.sort(
          (a, b) => b.avgRating - a.avgRating || b.totalReview - a.totalReview || a.distanceKm - b.distanceKm,
        );
      }
    } catch {
      // DB locations are enough when external places are unavailable.
    }

    return results.slice(0, cap);
  }

  async findById(id: string, userId?: string): Promise<LocationDetailResponse> {
    const loc = await this.locationsRepo.findOne({
      where: { id },
      relations: ['locationType'],
    });
    if (!loc) throw new NotFoundException('Location not found');
    return this.toDetailResponse(loc, userId);
  }

  async listMedia(locationId: string): Promise<{ items: LocationMediaItem[] }> {
    const loc = await this.locationsRepo.exist({ where: { id: locationId } });
    if (!loc) throw new NotFoundException('Location not found');

    const rows = await this.locationMediaRepo.find({
      where: { locationId },
      relations: ['media'],
      order: { aestheticScore: 'DESC', createdAt: 'DESC' },
      take: 40,
    });

    return {
      items: rows.map((row) => ({
        id: row.id,
        mediaId: row.mediaId,
        url: row.media.url,
        thumbnailUrl: row.media.thumbnailUrl ?? row.media.url,
        aestheticScore: row.aestheticScore != null ? Number(row.aestheticScore) : null,
        isPrimary: Boolean(row.isPrimary),
      })),
    };
  }

  async create(dto: CreateLocationDto): Promise<LocationResponse> {
    const entity = this.locationsRepo.create({
      name: dto.name,
      address: dto.address ?? null,
      latitude: String(dto.lat),
      longitude: String(dto.lng),
      locationTypeId: dto.locationTypeId ?? null,
      status: 'ACTIVE',
      sourceType: dto.externalSource ? (dto.externalSource.toUpperCase() as 'PHOTON' | 'NOMINATIM') : 'MANUAL',
      externalSource: dto.externalSource ?? null,
      externalId: dto.externalId ?? null,
    });
    const saved = await this.locationsRepo.save(entity);
    return this.findById(saved.id);
  }

  async upsertFromPlace(dto: UpsertFromPlaceDto): Promise<LocationResponse> {
    const existing = await this.locationsRepo.findOne({
      where: { externalSource: dto.source, externalId: dto.placeId },
      relations: ['locationType'],
    });
    if (existing) {
      return this.toResponse(existing);
    }
    return this.create({
      name: dto.name,
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
      locationTypeId: dto.locationTypeId,
      externalSource: dto.source,
      externalId: dto.placeId,
    });
  }

  async upsertFromPlaceResult(
    place: PlaceResultDto,
    locationTypeId?: string,
  ): Promise<LocationResponse> {
    return this.upsertFromPlace({
      placeId: place.id,
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      source: place.source,
      locationTypeId,
    });
  }

  resolvePersistedId(locationOrExternalId: string): string | null {
    if (!locationOrExternalId.startsWith('external:')) {
      return locationOrExternalId;
    }
    return null;
  }

  async drivingRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<{ coordinates: { latitude: number; longitude: number }[]; distanceM: number; durationS: number }> {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as {
          code?: string;
          routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
        };
        const route = data.routes?.[0];
        if (data.code === 'Ok' && route?.geometry?.coordinates?.length) {
          return {
            coordinates: route.geometry.coordinates.map(([lng, lat]) => ({
              latitude: lat,
              longitude: lng,
            })),
            distanceM: route.distance,
            durationS: route.duration,
          };
        }
      }
    } catch {
      // fall through to straight line
    }

    const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng);
    const distanceM = distanceKm * 1000;
    const steps = 24;
    const coordinates = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return {
        latitude: fromLat + (toLat - fromLat) * t,
        longitude: fromLng + (toLng - fromLng) * t,
      };
    });
    return {
      coordinates,
      distanceM,
      durationS: Math.max(60, (distanceM / 1000 / 30) * 3600),
    };
  }

  toResponse(loc: LocationEntity): LocationResponse {
    return {
      id: loc.id,
      name: loc.name,
      address: loc.address,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      status: loc.status,
      locationType: loc.locationType
        ? {
            id: loc.locationType.id,
            code: loc.locationType.code,
            name: loc.locationType.name,
            icon: loc.locationType.icon,
          }
        : null,
      avgRating: Number(loc.avgRating),
      totalReview: loc.totalReview,
    };
  }

  private async toDetailResponse(
    loc: LocationEntity,
    userId?: string,
  ): Promise<LocationDetailResponse> {
    let savedByMe = false;
    let savedLocationId: string | null = null;
    let hasMyReview = false;

    if (userId) {
      const saved = await this.savedRepo.findOne({
        where: { userId, locationId: loc.id },
      });
      savedByMe = Boolean(saved);
      savedLocationId = saved?.id ?? null;
      hasMyReview = await this.reviewsService.hasReview(loc.id, userId);
    }

    let openHours: unknown | null = null;
    if (loc.openHoursJson) {
      try {
        openHours = JSON.parse(loc.openHoursJson);
      } catch {
        openHours = null;
      }
    }

    return {
      ...this.toResponse(loc),
      phone: loc.phone,
      website: loc.website,
      priceLevel: loc.priceLevel,
      openHours,
      savedByMe,
      savedLocationId,
      hasMyReview,
    };
  }
}
