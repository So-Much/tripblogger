import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceResultDto } from '../places/dto/place.dto';
import { PlacesService } from '../places/places.service';
import { CreateLocationDto, UpsertFromPlaceDto } from './dto/create-location.dto';
import { LocationEntity } from './entities/location.entity';
import { LocationTypeEntity } from './entities/location-type.entity';

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

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
    @InjectRepository(LocationTypeEntity)
    private readonly typesRepo: Repository<LocationTypeEntity>,
    private readonly placesService: PlacesService,
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

    const places = await this.placesService.search(q, lat, lng, limit - mapped.length);
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

  async findById(id: string): Promise<LocationResponse> {
    const loc = await this.locationsRepo.findOne({
      where: { id },
      relations: ['locationType'],
    });
    if (!loc) throw new NotFoundException('Location not found');
    return this.toResponse(loc);
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
}
