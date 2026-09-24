import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeVi, type CreatePlaceDto, type PlaceSuggestionDto } from '@tripblogger/contracts';
import { PlaceEntity } from '../entities/place.entity';
import { PlaceContributionEntity } from '../entities/place-contribution.entity';
import { TypesensePlaces } from '../search/typesense.client';

const AUTO_APPROVE_AFTER = 3;

@Injectable()
export class ContributeService {
  constructor(
    @InjectRepository(PlaceEntity) private readonly places: Repository<PlaceEntity>,
    @InjectRepository(PlaceContributionEntity)
    private readonly contributions: Repository<PlaceContributionEntity>,
    private readonly typesense: TypesensePlaces,
  ) {}

  async approvedCount(userId: string): Promise<number> {
    return this.contributions.count({ where: { userId, status: 'approved' } });
  }

  async createPlace(userId: string, dto: CreatePlaceDto) {
    const auto = (await this.approvedCount(userId)) >= AUTO_APPROVE_AFTER;
    const place = await this.places.save(
      this.places.create({
        name: dto.name,
        normalizedName: normalizeVi(dto.name),
        category: dto.category ?? 'other',
        lat: String(dto.lat),
        lng: String(dto.lng),
        address: dto.address ?? null,
        openingHoursRaw: dto.openingHours ?? null,
        phone: dto.phone ?? null,
        website: dto.website ?? null,
        source: 'user',
        status: auto ? 'active' : 'pending',
        createdByUserId: userId,
      }),
    );
    const contribution = await this.contributions.save(
      this.contributions.create({
        placeId: place.id,
        userId,
        kind: 'create',
        payloadJson: JSON.stringify(dto),
        status: auto ? 'approved' : 'pending',
      }),
    );
    if (auto) await this.typesense.upsertPlaces([place]);
    return { place, contribution, pending: !auto };
  }

  async suggest(userId: string, placeId: string, dto: PlaceSuggestionDto) {
    const place = await this.places.findOne({ where: { id: placeId } });
    if (!place) throw new NotFoundException();
    const auto = (await this.approvedCount(userId)) >= AUTO_APPROVE_AFTER;
    const contribution = await this.contributions.save(
      this.contributions.create({
        placeId,
        userId,
        kind: 'edit',
        payloadJson: JSON.stringify(dto),
        status: auto ? 'approved' : 'pending',
      }),
    );
    if (auto) {
      await this.applyEdit(place, dto);
    }
    return { contribution, pending: !auto };
  }

  async review(id: string, decision: 'approved' | 'rejected', note?: string) {
    const row = await this.contributions.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    row.status = decision;
    row.reviewerNote = note ?? null;
    await this.contributions.save(row);
    if (decision === 'approved' && row.placeId) {
      const place = await this.places.findOne({ where: { id: row.placeId } });
      if (place) {
        if (row.kind === 'create') {
          place.status = 'active';
          await this.places.save(place);
          await this.typesense.upsertPlaces([place]);
        } else {
          await this.applyEdit(place, JSON.parse(row.payloadJson) as PlaceSuggestionDto);
        }
      }
    }
    return row;
  }

  private async applyEdit(place: PlaceEntity, dto: PlaceSuggestionDto) {
    if (dto.name) {
      place.name = dto.name;
      place.normalizedName = normalizeVi(dto.name);
    }
    if (dto.address !== undefined) place.address = dto.address ?? null;
    if (dto.openingHours !== undefined) place.openingHoursRaw = dto.openingHours ?? null;
    if (dto.phone !== undefined) place.phone = dto.phone ?? null;
    if (dto.website !== undefined) place.website = dto.website ?? null;
    if (dto.category !== undefined) place.category = dto.category;
    place.version += 1;
    await this.places.save(place);
    if (place.status === 'active') await this.typesense.upsertPlaces([place]);
  }
}
