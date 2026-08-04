import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaEntity } from '../media/entities/media.entity';
import { EventBlockEntity } from './entities/event-block.entity';
import { TripCheckInEntity } from './entities/trip-check-in.entity';
import { TripCheckInMediaEntity } from './entities/trip-check-in-media.entity';
import { TripPermissionsService } from './trip-permissions.service';

@Injectable()
export class TripCheckInsService {
  constructor(
    @InjectRepository(TripCheckInEntity)
    private readonly checkInsRepo: Repository<TripCheckInEntity>,
    @InjectRepository(TripCheckInMediaEntity)
    private readonly checkInMediaRepo: Repository<TripCheckInMediaEntity>,
    @InjectRepository(EventBlockEntity)
    private readonly blocksRepo: Repository<EventBlockEntity>,
    @InjectRepository(MediaEntity)
    private readonly mediaRepo: Repository<MediaEntity>,
    private readonly permissions: TripPermissionsService,
  ) {}

  async create(
    tripId: string,
    userId: string,
    dto: {
      eventBlockId?: string;
      note?: string;
      latitude?: number;
      longitude?: number;
      checkedInAt?: string;
    },
  ) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');

    if (dto.eventBlockId) {
      const block = await this.blocksRepo.findOne({
        where: { id: dto.eventBlockId, tripId },
      });
      if (!block) throw new NotFoundException('Event block not found');
      block.status = 'DONE';
      await this.blocksRepo.save(block);
    }

    const checkIn = await this.checkInsRepo.save(
      this.checkInsRepo.create({
        tripId,
        eventBlockId: dto.eventBlockId ?? null,
        note: dto.note ?? null,
        latitude: dto.latitude != null ? String(dto.latitude) : null,
        longitude: dto.longitude != null ? String(dto.longitude) : null,
        checkedInAt: dto.checkedInAt ? new Date(dto.checkedInAt) : new Date(),
      }),
    );

    return this.serialize(checkIn, []);
  }

  async attachMedia(
    tripId: string,
    userId: string,
    checkInId: string,
    mediaId: string,
  ) {
    await this.permissions.assertCan(tripId, userId, 'edit_stops');
    const checkIn = await this.checkInsRepo.findOne({ where: { id: checkInId, tripId } });
    if (!checkIn) throw new NotFoundException('Check-in not found');

    const media = await this.mediaRepo.findOne({ where: { id: mediaId, userId } });
    if (!media) throw new NotFoundException('Media not found');

    const count = await this.checkInMediaRepo.count({ where: { checkInId } });
    await this.checkInMediaRepo.save(
      this.checkInMediaRepo.create({
        checkInId,
        mediaId,
        orderIndex: count,
      }),
    );

    const links = await this.checkInMediaRepo.find({
      where: { checkInId },
      relations: ['media'],
      order: { orderIndex: 'ASC' },
    });
    return this.serialize(checkIn, links);
  }

  async list(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const items = await this.checkInsRepo.find({
      where: { tripId },
      relations: ['media', 'media.media'],
      order: { checkedInAt: 'ASC' },
    });
    return {
      items: items.map((c) => this.serialize(c, c.media ?? [])),
    };
  }

  private serialize(checkIn: TripCheckInEntity, links: TripCheckInMediaEntity[]) {
    return {
      id: checkIn.id,
      tripId: checkIn.tripId,
      eventBlockId: checkIn.eventBlockId,
      checkedInAt: checkIn.checkedInAt,
      latitude: checkIn.latitude ? Number(checkIn.latitude) : null,
      longitude: checkIn.longitude ? Number(checkIn.longitude) : null,
      note: checkIn.note,
      media: links
        .filter((l) => l.media)
        .map((l) => ({
          mediaId: l.mediaId,
          orderIndex: l.orderIndex,
          url: l.media.url,
          thumbnailUrl: l.media.thumbnailUrl,
          type: l.media.type,
        })),
    };
  }
}
