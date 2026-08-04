import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostsService } from '../posts/posts.service';
import { PostEntity } from '../posts/entities/post.entity';
import { EventBlockEntity } from './entities/event-block.entity';
import { TripCheckInEntity } from './entities/trip-check-in.entity';
import { TripDayEntity } from './entities/trip-day.entity';
import { TripEntity } from './entities/trip.entity';
import { TripPostEntity } from './entities/trip-post.entity';
import { TripPermissionsService } from './trip-permissions.service';
import { buildTripBlogHtml, BuildTripBlogInput } from './assemble/build-trip-blog-html';

@Injectable()
export class TripAssembleService {
  constructor(
    @InjectRepository(TripEntity)
    private readonly tripsRepo: Repository<TripEntity>,
    @InjectRepository(TripDayEntity)
    private readonly daysRepo: Repository<TripDayEntity>,
    @InjectRepository(EventBlockEntity)
    private readonly blocksRepo: Repository<EventBlockEntity>,
    @InjectRepository(TripCheckInEntity)
    private readonly checkInsRepo: Repository<TripCheckInEntity>,
    @InjectRepository(TripPostEntity)
    private readonly tripPostsRepo: Repository<TripPostEntity>,
    @InjectRepository(PostEntity)
    private readonly postsRepo: Repository<PostEntity>,
    private readonly postsService: PostsService,
    private readonly permissions: TripPermissionsService,
  ) {}

  async assembleDraftPost(tripId: string, userId: string) {
    await this.permissions.assertOwner(tripId, userId);
    const trip = await this.tripsRepo.findOne({
      where: { id: tripId },
      relations: ['destination'],
    });
    if (!trip) throw new NotFoundException('Trip not found');

    const days = await this.daysRepo.find({
      where: { tripId },
      order: { dayNumber: 'ASC' },
    });
    const blocks = await this.blocksRepo.find({
      where: { tripId },
      relations: ['location'],
      order: { orderIndex: 'ASC' },
    });
    const checkIns = await this.checkInsRepo.find({
      where: { tripId },
      relations: ['media', 'media.media'],
      order: { checkedInAt: 'ASC' },
    });

    const destName = trip.destination?.name ?? trip.destinationName ?? 'Trip';
    const title =
      trip.title?.trim() ||
      `Trip đến ${destName} (${trip.startDate} – ${trip.endDate})`;

    const htmlInput: BuildTripBlogInput = {
      destinationName: destName,
      days: days.map((d) => ({
        dayNumber: d.dayNumber,
        date: d.date,
        blocks: blocks
          .filter((b) => b.tripDayId === d.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((b) => ({
            name: b.location?.name ?? b.customName ?? 'Điểm dừng',
            status: b.status,
            note:
              checkIns.find((c) => c.eventBlockId === b.id)?.note ?? null,
          })),
      })),
      unscheduled: blocks
        .filter((b) => !b.tripDayId)
        .map((b) => ({
          name: b.location?.name ?? b.customName ?? 'Điểm dừng',
          status: b.status,
        })),
    };

    const contentHtml = buildTripBlogHtml(htmlInput);
    const media = checkIns.flatMap((c) =>
      (c.media ?? [])
        .filter((m) => m.media)
        .map((m) => ({
          mediaId: m.mediaId,
          type: m.media.type as 'icon' | 'image' | 'video',
          url: m.media.url,
          thumbnailUrl: m.media.thumbnailUrl ?? undefined,
          previewUrl: m.media.previewUrl ?? undefined,
          originalUrl: m.media.originalUrl ?? undefined,
        })),
    );

    const existingLink = await this.tripPostsRepo.findOne({
      where: { tripId, assembleKind: 'BLOG_DRAFT' },
    });

    if (existingLink) {
      const post = await this.postsRepo.findOne({ where: { id: existingLink.postId } });
      if (post && post.status === 'PUBLISHED') {
        const serialized = await this.postsService.findOne(post.id, userId);
        return {
          postId: post.id,
          alreadyPublished: true,
          post: serialized,
        };
      }
      if (post && post.status === 'DRAFT') {
        const updated = await this.postsService.updatePost(userId, post.id, {
          title,
          contentHtml,
          media,
          tags: [destName],
          category: 'trip',
        });
        return { postId: post.id, alreadyPublished: false, post: updated };
      }
    }

    const created = await this.postsService.createPost(userId, {
      title,
      contentHtml,
      status: 'DRAFT',
      media,
      tags: [destName],
      category: 'trip',
    });

    await this.tripPostsRepo.save(
      this.tripPostsRepo.create({
        tripId,
        postId: created.id,
        assembleKind: 'BLOG_DRAFT',
      }),
    );

    return { postId: created.id, alreadyPublished: false, post: created };
  }
}
