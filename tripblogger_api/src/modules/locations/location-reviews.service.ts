import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MemberProfileEntity } from '../users/entities/member-profile.entity';
import { CreateLocationReviewDto, UpdateLocationReviewDto } from './dto/create-location-review.dto';
import { LocationEntity } from './entities/location.entity';
import { LocationReviewEntity } from './entities/location-review.entity';

export type LocationReviewItem = {
  id: string;
  locationId: string;
  userId: string;
  rating: number;
  content: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: { displayName: string; avatarUrl: string | null };
};

export type LocationReviewsPage = {
  items: LocationReviewItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type LocationReviewSummary = {
  total: number;
  avgRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  tags: { tag: string; count: number }[];
};

@Injectable()
export class LocationReviewsService {
  constructor(
    @InjectRepository(LocationReviewEntity)
    private readonly reviewsRepo: Repository<LocationReviewEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationsRepo: Repository<LocationEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    locationId: string,
    sort: 'recent' | 'rating' = 'recent',
    page = 1,
    limit = 10,
  ): Promise<LocationReviewsPage> {
    await this.assertLocationExists(locationId);
    const cap = Math.min(limit, 30);
    const skip = (page - 1) * cap;

    const qb = this.reviewsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('u.memberProfile', 'mp')
      .where('r.location_id = :locationId', { locationId });

    if (sort === 'rating') {
      qb.orderBy('r.rating', 'DESC').addOrderBy('r.created_at', 'DESC');
    } else {
      qb.orderBy('r.created_at', 'DESC');
    }

    const [rows, total] = await qb.skip(skip).take(cap).getManyAndCount();

    return {
      items: rows.map((r) => this.mapReview(r)),
      page,
      limit: cap,
      total,
      hasMore: skip + rows.length < total,
    };
  }

  async summary(locationId: string): Promise<LocationReviewSummary> {
    await this.assertLocationExists(locationId);

    const distRows = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.location_id = :locationId', { locationId })
      .groupBy('r.rating')
      .getRawMany<{ rating: number; cnt: string }>();

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    let sum = 0;
    for (const row of distRows) {
      const rating = Number(row.rating) as 1 | 2 | 3 | 4 | 5;
      const cnt = Number(row.cnt);
      if (rating >= 1 && rating <= 5) {
        distribution[rating] = cnt;
        total += cnt;
        sum += rating * cnt;
      }
    }

    const tagRows = await this.reviewsRepo.find({
      where: { locationId },
      select: ['tagsJson'],
    });
    const tagCounts = new Map<string, number>();
    for (const row of tagRows) {
      const tags = this.parseTags(row.tagsJson);
      for (const tag of tags) {
        const key = tag.trim().toLowerCase();
        if (!key) continue;
        tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
      }
    }
    const tags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      total,
      avgRating: total > 0 ? Math.round((sum / total) * 100) / 100 : 0,
      distribution,
      tags,
    };
  }

  async findMine(locationId: string, userId: string): Promise<LocationReviewItem | null> {
    const row = await this.reviewsRepo.findOne({
      where: { locationId, userId },
      relations: ['user', 'user.memberProfile'],
    });
    return row ? this.mapReview(row) : null;
  }

  async create(locationId: string, userId: string, dto: CreateLocationReviewDto) {
    await this.assertLocationExists(locationId);
    const existing = await this.reviewsRepo.findOne({ where: { locationId, userId } });
    if (existing) {
      throw new ConflictException('You already reviewed this location');
    }

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(LocationReviewEntity).save(
        manager.getRepository(LocationReviewEntity).create({
          locationId,
          userId,
          rating: dto.rating,
          content: dto.content?.trim() || null,
          tagsJson: dto.tags?.length ? JSON.stringify(dto.tags) : null,
        }),
      );
      await this.recomputeAggregates(manager.getRepository(LocationEntity), locationId);
      const full = await manager.getRepository(LocationReviewEntity).findOne({
        where: { id: saved.id },
        relations: ['user', 'user.memberProfile'],
      });
      return this.mapReview(full!);
    });
  }

  async update(
    locationId: string,
    reviewId: string,
    userId: string,
    dto: UpdateLocationReviewDto,
  ) {
    const review = await this.reviewsRepo.findOne({
      where: { id: reviewId, locationId },
      relations: ['user', 'user.memberProfile'],
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('Not your review');

    if (dto.rating != null) review.rating = dto.rating;
    if (dto.content !== undefined) review.content = dto.content?.trim() || null;
    if (dto.tags !== undefined) {
      review.tagsJson = dto.tags.length ? JSON.stringify(dto.tags) : null;
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(LocationReviewEntity).save(review);
      await this.recomputeAggregates(manager.getRepository(LocationEntity), locationId);
      return this.mapReview(review);
    });
  }

  async hasReview(locationId: string, userId: string): Promise<boolean> {
    const count = await this.reviewsRepo.count({ where: { locationId, userId } });
    return count > 0;
  }

  private async recomputeAggregates(
    locationsRepo: Repository<LocationEntity>,
    locationId: string,
  ) {
    const agg = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('AVG(CAST(r.rating AS float))', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.location_id = :locationId', { locationId })
      .getRawOne<{ avg: string | null; cnt: string }>();

    const avg = agg?.avg != null ? Number(agg.avg) : 0;
    const cnt = agg?.cnt != null ? Number(agg.cnt) : 0;
    await locationsRepo.update(locationId, {
      avgRating: String(Math.round(avg * 100) / 100),
      totalReview: cnt,
    });
  }

  private async assertLocationExists(locationId: string) {
    const exists = await this.locationsRepo.exist({ where: { id: locationId } });
    if (!exists) throw new NotFoundException('Location not found');
  }

  private mapReview(r: LocationReviewEntity): LocationReviewItem {
    const profile = r.user?.memberProfile as MemberProfileEntity | undefined;
    const customDisplay = profile?.displayName?.trim();
    return {
      id: r.id,
      locationId: r.locationId,
      userId: r.userId,
      rating: r.rating,
      content: r.content,
      tags: this.parseTags(r.tagsJson),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      author: {
        displayName: customDisplay || profile?.username || 'Member',
        avatarUrl: profile?.avatarUrl ?? null,
      },
    };
  }

  private parseTags(tagsJson: string | null): string[] {
    if (!tagsJson) return [];
    try {
      const parsed = JSON.parse(tagsJson) as unknown;
      return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
    } catch {
      return [];
    }
  }
}
