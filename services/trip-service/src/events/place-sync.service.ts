import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DomainEvent, PlaceChangedPayload } from '@tripblogger/events';
import { TripStopEntity } from '../trips/entities/trip-stop.entity';

@Injectable()
export class PlaceSyncService {
  constructor(@InjectRepository(TripStopEntity) private readonly stops: Repository<TripStopEntity>) {}

  /** Idempotent: re-applying the same or an older version changes nothing. */
  async apply(event: DomainEvent<unknown>): Promise<number> {
    if (event.type !== 'place.updated' && event.type !== 'place.created') return 0;
    const p = event.payload as PlaceChangedPayload;
    if (!p?.placeId || typeof p.version !== 'number') {
      throw new Error(`invalid ${event.type} payload`);
    }
    const res = await this.stops
      .createQueryBuilder()
      .update(TripStopEntity)
      .set({
        name: p.name.slice(0, 255),
        category: p.category,
        address: p.address,
        lat: String(p.lat),
        lng: String(p.lng),
        openingHoursRaw: p.openingHoursRaw,
        placeVersion: p.version,
      })
      .where('place_id = :placeId', { placeId: p.placeId })
      .andWhere('(place_version IS NULL OR place_version < :version)', { version: p.version })
      .execute();
    return res.affected ?? 0;
  }
}
