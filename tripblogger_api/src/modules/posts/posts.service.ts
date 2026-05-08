import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sanitizeHtml from 'sanitize-html';
import { Repository } from 'typeorm';
import { REACTION_TYPE_IDS } from './constants';
import { decodePostCursor, encodePostCursor } from './cursor.util';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryCommentsDto, QueryMinePostsDto } from './dto/query-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CommentEntity } from './entities/comment.entity';
import { PostEntity, PostStatus } from './entities/post.entity';
import { ReactEntity } from './entities/react.entity';
import { ReactTypeEntity, ReactTypeUseFor } from './entities/react-type.entity';

const POST_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img', 'span']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height'],
    a: ['href', 'name', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

function sanitizePostHtml(raw: string): string {
  return sanitizeHtml(raw, POST_SANITIZE);
}

function sanitizeCommentText(raw: string): string {
  return sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} }).trim();
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function parseLocation(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function validateReactTypeForTarget(useFor: ReactTypeUseFor, target: 'POST' | 'COMMENT'): void {
  if (target === 'POST') {
    if (useFor !== 'POST' && useFor !== 'BOTH') {
      throw new BadRequestException('This reaction type cannot be used on posts');
    }
  } else if (useFor !== 'COMMENT' && useFor !== 'BOTH') {
    throw new BadRequestException('This reaction type cannot be used on comments');
  }
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity) private readonly postsRepo: Repository<PostEntity>,
    @InjectRepository(CommentEntity) private readonly commentsRepo: Repository<CommentEntity>,
    @InjectRepository(ReactEntity) private readonly reactsRepo: Repository<ReactEntity>,
    @InjectRepository(ReactTypeEntity) private readonly reactTypesRepo: Repository<ReactTypeEntity>,
  ) {}

  private canViewPost(post: PostEntity, viewerUserId: string): boolean {
    if (post.userId === viewerUserId) return true;
    return post.status === 'PUBLISHED';
  }

  private serializePost(
    post: PostEntity,
    extras?: {
      reactionCounts?: Record<string, number>;
      myReactionTypeIds?: string[];
    },
  ) {
    return {
      id: post.id,
      userId: post.userId,
      title: post.title,
      contentHtml: post.contentHtml,
      media: parseJsonArray(post.mediaJson),
      category: post.category,
      tags: parseJsonArray(post.tagsJson),
      visibility: post.visibility,
      location: parseLocation(post.locationJson),
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      reactionCounts: extras?.reactionCounts ?? {},
      myReactionTypeIds: extras?.myReactionTypeIds ?? [],
    };
  }

  private async getPostReactionMeta(postId: string, viewerUserId?: string): Promise<{
    reactionCounts: Record<string, number>;
    myReactionTypeIds: string[];
  }> {
    const countRows = await this.reactsRepo
      .createQueryBuilder('r')
      .select('r.type_id', 'typeId')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.post_id = :postId', { postId })
      .groupBy('r.type_id')
      .getRawMany<{ typeId: string; cnt: string }>();

    const reactionCounts: Record<string, number> = {};
    for (const row of countRows) {
      reactionCounts[row.typeId] = Number(row.cnt);
    }

    let myReactionTypeIds: string[] = [];
    if (viewerUserId) {
      const mine = await this.reactsRepo.find({
        where: { postId, userId: viewerUserId },
        select: ['typeId'],
      });
      myReactionTypeIds = mine.map((r) => r.typeId);
    }

    return { reactionCounts, myReactionTypeIds };
  }

  async listReactionTypes(): Promise<{ id: string; code: string; name: string; media: string | null; useFor: string }[]> {
    const types = await this.reactTypesRepo.find({ order: { code: 'ASC' } });
    return types.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      media: t.media,
      useFor: t.useFor,
    }));
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const contentHtml = sanitizePostHtml(dto.contentHtml);
    const media = dto.media ?? [];
    const tags = dto.tags ?? [];
    const post = this.postsRepo.create({
      userId,
      title: dto.title.trim(),
      contentHtml,
      mediaJson: media.length ? JSON.stringify(media) : null,
      category: dto.category?.trim() ?? null,
      tagsJson: tags.length ? JSON.stringify(tags) : null,
      visibility: dto.visibility ?? 'PUBLIC',
      locationJson: dto.location ? JSON.stringify(dto.location) : null,
      status: dto.status ?? 'DRAFT',
    });
    await this.postsRepo.save(post);
    return this.serializePost(post);
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Not your post');
    if (dto.title !== undefined) post.title = dto.title.trim();
    if (dto.contentHtml !== undefined) post.contentHtml = sanitizePostHtml(dto.contentHtml);
    if (dto.visibility !== undefined) post.visibility = dto.visibility;
    if (dto.status !== undefined) post.status = dto.status as PostStatus;
    if (dto.category !== undefined) post.category = dto.category?.trim() ?? null;
    if (dto.location !== undefined) {
      post.locationJson = dto.location ? JSON.stringify(dto.location) : null;
    }
    await this.postsRepo.save(post);
    const meta = await this.getPostReactionMeta(post.id, userId);
    return this.serializePost(post, meta);
  }

  async softDeletePost(userId: string, postId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Not your post');
    post.status = 'DELETED';
    await this.postsRepo.save(post);
    return { ok: true as const };
  }

  async findMine(userId: string, query: QueryMinePostsDto) {
    const limit = query.limit;
    const qb = this.postsRepo
      .createQueryBuilder('p')
      .where('p.user_id = :userId', { userId })
      .andWhere('p.status != :del', { del: 'DELETED' })
      .orderBy('p.created_at', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .take(limit + 1);

    if (query.cursor) {
      const { createdAt, id } = decodePostCursor(query.cursor);
      qb.andWhere('(p.created_at < :c OR (p.created_at = :c AND p.id < :i))', {
        c: createdAt,
        i: id,
      });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? encodePostCursor(last.createdAt, last.id) : null;

    const payloads = await Promise.all(
      items.map(async (p) => {
        const meta = await this.getPostReactionMeta(p.id, userId);
        return this.serializePost(p, meta);
      }),
    );

    return { items: payloads, nextCursor };
  }

  async findOne(postId: string, viewerUserId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, viewerUserId)) throw new NotFoundException('Post not found');

    const meta = await this.getPostReactionMeta(post.id, viewerUserId);
    return this.serializePost(post, meta);
  }

  async togglePostReaction(userId: string, postId: string, typeId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, userId)) throw new NotFoundException('Post not found');

    const rtype = await this.reactTypesRepo.findOne({ where: { id: typeId } });
    if (!rtype) throw new NotFoundException('Reaction type not found');
    validateReactTypeForTarget(rtype.useFor, 'POST');

    const existing = await this.reactsRepo.findOne({
      where: { userId, postId, typeId },
    });
    if (existing) {
      await this.reactsRepo.remove(existing);
      const meta = await this.getPostReactionMeta(postId, userId);
      return { toggledOn: false as const, post: this.serializePost(post, meta) };
    }
    const row = this.reactsRepo.create({ userId, postId, commentId: null, typeId });
    await this.reactsRepo.save(row);
    const meta = await this.getPostReactionMeta(postId, userId);
    return { toggledOn: true as const, post: this.serializePost(post, meta) };
  }

  async sharePost(userId: string, postId: string) {
    return this.togglePostReaction(userId, postId, REACTION_TYPE_IDS.SHARE);
  }

  async addComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, userId)) throw new NotFoundException('Post not found');
    if (post.status === 'DELETED') throw new NotFoundException('Post not found');

    let parent: CommentEntity | null = null;
    if (dto.parentCommentId) {
      parent = await this.commentsRepo.findOne({ where: { id: dto.parentCommentId } });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Invalid parent comment');
      }
    }

    const content = sanitizeCommentText(dto.content);
    if (!content) throw new BadRequestException('Comment is empty');

    const comment = this.commentsRepo.create({
      userId,
      postId,
      content,
      parentCommentId: parent?.id ?? null,
    });
    await this.commentsRepo.save(comment);
    return {
      id: comment.id,
      userId: comment.userId,
      postId: comment.postId,
      content: comment.content,
      parentCommentId: comment.parentCommentId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  async listComments(postId: string, viewerUserId: string, query: QueryCommentsDto) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, viewerUserId)) throw new NotFoundException('Post not found');

    const limit = query.limit;
    const qb = this.commentsRepo
      .createQueryBuilder('c')
      .where('c.post_id = :postId', { postId })
      .orderBy('c.created_at', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .take(limit + 1);

    if (query.cursor) {
      const { createdAt, id } = decodePostCursor(query.cursor);
      qb.andWhere('(c.created_at < :c OR (c.created_at = :c AND c.id < :i))', {
        c: createdAt,
        i: id,
      });
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodePostCursor(last.createdAt, last.id) : null;

    const serialized = items.map((c) => ({
      id: c.id,
      userId: c.userId,
      postId: c.postId,
      content: c.content,
      parentCommentId: c.parentCommentId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return { items: serialized, nextCursor };
  }

  async toggleCommentReaction(userId: string, postId: string, commentId: string, typeId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, userId)) throw new NotFoundException('Post not found');

    const comment = await this.commentsRepo.findOne({ where: { id: commentId } });
    if (!comment || comment.postId !== postId) throw new NotFoundException('Comment not found');

    const rtype = await this.reactTypesRepo.findOne({ where: { id: typeId } });
    if (!rtype) throw new NotFoundException('Reaction type not found');
    validateReactTypeForTarget(rtype.useFor, 'COMMENT');

    const existing = await this.reactsRepo.findOne({
      where: { userId, commentId, typeId },
    });
    if (existing) {
      await this.reactsRepo.remove(existing);
      return { toggledOn: false as const, commentId };
    }
    const row = this.reactsRepo.create({ userId, postId: null, commentId, typeId });
    await this.reactsRepo.save(row);
    return { toggledOn: true as const, commentId };
  }
}
