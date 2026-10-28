import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { normalizeVi, type CreatePlaceDto, type PlaceSuggestionDto } from '@tripblogger/contracts';
import type { DomainEvent, PlaceChangedPayload } from '@tripblogger/events';
import { PlaceEntity } from '../entities/place.entity';
import { PlaceContributionEntity } from '../entities/place-contribution.entity';
import { PlaceOutboxEntity } from '../entities/place-outbox.entity';
import { TypesensePlaces } from '../search/typesense.client';

const AUTO_APPROVE_AFTER = 3;

type PlaceEventType = 'place.created' | 'place.updated';

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
    const { place, contribution } = await this.places.manager.transaction(async (em) => {
      const place = await em.getRepository(PlaceEntity).save(
        em.getRepository(PlaceEntity).create({
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
      const contribution = await em.getRepository(PlaceContributionEntity).save(
        em.getRepository(PlaceContributionEntity).create({
          placeId: place.id,
          userId,
          kind: 'create',
          payloadJson: JSON.stringify(dto),
          status: auto ? 'approved' : 'pending',
        }),
      );
      if (auto) await this.enqueuePlaceEvent(em, 'place.created', place);
      return { place, contribution };
    });
    if (auto) await this.indexQuietly(place);
    return { place, contribution, pending: !auto };
  }

  async suggest(userId: string, placeId: string, dto: PlaceSuggestionDto) {
    const place = await this.places.findOne({ where: { id: placeId } });
    if (!place) throw new NotFoundException();
    const auto = (await this.approvedCount(userId)) >= AUTO_APPROVE_AFTER;
    const contribution = await this.places.manager.transaction(async (em) => {
      const row = await em.getRepository(PlaceContributionEntity).save(
        em.getRepository(PlaceContributionEntity).create({
          placeId,
          userId,
          kind: 'edit',
          payloadJson: JSON.stringify(dto),
          status: auto ? 'approved' : 'pending',
        }),
      );
      if (auto) await this.applyEdit(em, place, dto);
      return row;
    });
    if (auto && place.status === 'active') await this.indexQuietly(place);
    return { contribution, pending: !auto };
  }

  async review(id: string, decision: 'approved' | 'rejected', note?: string) {
    const row = await this.contributions.findOne({ where: { id } });
    if (!row) throw new NotFoundException();
    let indexed: PlaceEntity | null = null;
    await this.places.manager.transaction(async (em) => {
      row.status = decision;
      row.reviewerNote = note ?? null;
      await em.getRepository(PlaceContributionEntity).save(row);
      if (decision !== 'approved' || !row.placeId) return;
      const place = await em.getRepository(PlaceEntity).findOne({ where: { id: row.placeId } });
      if (!place) return;
      if (row.kind === 'create') {
        place.status = 'active';
        await em.getRepository(PlaceEntity).save(place);
        await this.enqueuePlaceEvent(em, 'place.created', place);
      } else {
        await this.applyEdit(em, place, JSON.parse(row.payloadJson) as PlaceSuggestionDto);
      }
      if (place.status === 'active') indexed = place;
    });
    if (indexed) await this.indexQuietly(indexed);
    return row;
  }

  private async applyEdit(em: EntityManager, place: PlaceEntity, dto: PlaceSuggestionDto) {
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
    await em.getRepository(PlaceEntity).save(place);
    if (place.status === 'active') await this.enqueuePlaceEvent(em, 'place.updated', place);
  }

  /** Search index is derived data; a failed upsert must not roll back the committed write. */
  private async indexQuietly(place: PlaceEntity) {
    await this.typesense.upsertPlaces([place]).catch(() => undefined);
  }

  private async enqueuePlaceEvent(em: EntityManager, type: PlaceEventType, place: PlaceEntity): Promise<void> {
    const event: DomainEvent<PlaceChangedPayload> = {
      id: randomUUID(),
      type,
      occurredAt: new Date().toISOString(),
      payload: {
        placeId: place.id,
        version: place.version,
        name: place.name,
        category: place.category,
        address: place.address,
        lat: Number(place.lat),
        lng: Number(place.lng),
        openingHoursRaw: place.openingHoursRaw,
      },
    };
    const repo = em.getRepository(PlaceOutboxEntity);
    await repo.save(repo.create({ eventType: type, payloadJson: JSON.stringify(event), publishedAt: null }));
  }
}
