import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostEntity } from '../posts/entities/post.entity';
import { TripPostEntity } from './entities/trip-post.entity';
import { TripPermissionsService } from './trip-permissions.service';

@Injectable()
export class TripPostsService {
  constructor(
    @InjectRepository(TripPostEntity)
    private readonly tripPostsRepo: Repository<TripPostEntity>,
    @InjectRepository(PostEntity)
    private readonly postsRepo: Repository<PostEntity>,
    private readonly permissions: TripPermissionsService,
  ) {}

  async list(tripId: string, userId: string) {
    await this.permissions.assertCan(tripId, userId, 'view');
    const links = await this.tripPostsRepo.find({
      where: { tripId },
      relations: ['post'],
      order: { linkedAt: 'DESC' },
    });
    return links.map((l) => ({
      postId: l.postId,
      linkedAt: l.linkedAt,
      title: l.post.title,
      status: l.post.status,
    }));
  }

  async link(tripId: string, userId: string, postId: string) {
    await this.permissions.assertCan(tripId, userId, 'edit_trip');
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Can only link your own posts');
    await this.tripPostsRepo.save(this.tripPostsRepo.create({ tripId, postId }));
    return { tripId, postId };
  }

  async unlink(tripId: string, userId: string, postId: string) {
    await this.permissions.assertCan(tripId, userId, 'edit_trip');
    await this.tripPostsRepo.delete({ tripId, postId });
    return { deleted: true };
  }
}
