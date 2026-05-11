import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { join } from 'path';
import sanitizeHtml from 'sanitize-html';
import { Repository } from 'typeorm';
import { decodePostCursor, encodePostCursor } from './cursor.util';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryCommentsDto, QueryMinePostsDto } from './dto/query-posts.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CommentEntity } from './entities/comment.entity';
import { PostEntity, PostStatus } from './entities/post.entity';
import { ReactEntity } from './entities/react.entity';
import { ReactTypeEntity, ReactTypeUseFor } from './entities/react-type.entity';
import { PostsRealtimeGateway } from './posts.realtime.gateway';
import { MediaResolver } from './media.resolver';
import { MediaMigrationWorker } from './media.migration.worker';
import { normalizePostMediaItem, PostMediaItem } from './media.types';

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

function parseMedia(raw: string | null): PostMediaItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as Array<Record<string, unknown>>).map((item) => normalizePostMediaItem(item)) : [];
  } catch {
    return [];
  }
}

function toLocalUploadPath(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/uploads/')) return value;
  try {
    const parsed = new URL(value);
    return parsed.pathname.startsWith('/uploads/') ? parsed.pathname : undefined;
  } catch {
    return undefined;
  }
}

function isLocalMediaPathAvailable(value?: string): boolean {
  const localPath = toLocalUploadPath(value);
  if (!localPath) return Boolean(value);
  return existsSync(join(process.cwd(), localPath.replace(/^\/+/, '')));
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
    private readonly realtimeGateway: PostsRealtimeGateway,
    private readonly mediaResolver: MediaResolver,
    private readonly mediaMigrationWorker: MediaMigrationWorker,
  ) {}

  private canViewPost(post: PostEntity, viewerUserId: string): boolean {
    if (post.status === 'DELETED') return false;
    if (post.status === 'PUBLISHED') return true;
    return post.userId === viewerUserId;
  }

  private ensurePostPublishedForInteraction(post: PostEntity): void {
    if (post.status === 'DELETED') {
      throw new NotFoundException('Post not found');
    }
    if (post.status !== 'PUBLISHED') {
      throw new ForbiddenException('Draft posts cannot be interacted with');
    }
  }

  private serializePost(
    post: PostEntity,
    extras?: {
      reactionCounts?: Record<string, number>;
      myReactionCodes?: string[];
      commentCount?: number;
      shareCount?: number;
    },
  ) {
    const visibility = post.visibility;
    const resolvedMedia = parseMedia(post.mediaJson).map((item) => {
      const resolvePath = (path?: string) => {
        if (!path) return undefined;
        const localPath = toLocalUploadPath(path);
        if (localPath) {
          return visibility === 'PRIVATE' ? this.mediaResolver.toPrivateSignedPath(localPath) : localPath;
        }
        if (!path.startsWith('/')) return path;
        return visibility === 'PRIVATE' ? this.mediaResolver.toPrivateSignedPath(path) : path;
      };
      const variants = {
        thumbnailUrl: isLocalMediaPathAvailable(item.thumbnailUrl) ? item.thumbnailUrl : undefined,
        previewUrl: isLocalMediaPathAvailable(item.previewUrl) ? item.previewUrl : undefined,
        originalUrl: isLocalMediaPathAvailable(item.originalUrl ?? item.url) ? (item.originalUrl ?? item.url) : undefined,
      };
      const primaryUrl = variants.previewUrl ?? variants.originalUrl ?? variants.thumbnailUrl;
      const missingVariants = [
        item.thumbnailUrl && !variants.thumbnailUrl ? 'thumbnailUrl' : null,
        item.previewUrl && !variants.previewUrl ? 'previewUrl' : null,
        (item.originalUrl ?? item.url) && !variants.originalUrl ? 'originalUrl' : null,
      ].filter((variant): variant is string => Boolean(variant));
      const available = Boolean(primaryUrl);
      return {
        ...item,
        url: resolvePath(primaryUrl) ?? item.url,
        thumbnailUrl: resolvePath(variants.thumbnailUrl),
        previewUrl: resolvePath(variants.previewUrl),
        originalUrl: resolvePath(variants.originalUrl),
        available,
        missingVariants,
        loadFailedAt: available ? undefined : new Date().toISOString(),
      };
    });
    return {
      id: post.id,
      userId: post.userId,
      title: post.title,
      contentHtml: post.contentHtml,
      media: resolvedMedia,
      category: post.category,
      tags: parseJsonArray(post.tagsJson),
      visibility: post.visibility,
      location: parseLocation(post.locationJson),
      status: post.status,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      reactionCounts: extras?.reactionCounts ?? {},
      myReactionCodes: extras?.myReactionCodes ?? [],
      commentCount: extras?.commentCount ?? 0,
      shareCount: extras?.shareCount ?? 0,
    };
  }

  private async getPostReactionMeta(postId: string, viewerUserId?: string): Promise<{
    reactionCounts: Record<string, number>;
    myReactionCodes: string[];
    shareCount: number;
  }> {
    const countRows = await this.reactsRepo
      .createQueryBuilder('r')
      .leftJoin('react_types', 'rt', 'rt.id = r.type_id')
      .select('rt.code', 'typeCode')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.post_id = :postId', { postId })
      .groupBy('rt.code')
      .getRawMany<{ typeCode: string; cnt: string }>();

    const reactionCounts: Record<string, number> = {};
    for (const row of countRows) {
      reactionCounts[row.typeCode] = Number(row.cnt);
    }

    let myReactionCodes: string[] = [];
    if (viewerUserId) {
      const mine = await this.reactsRepo
        .createQueryBuilder('r')
        .leftJoin('react_types', 'rt', 'rt.id = r.type_id')
        .select('rt.code', 'typeCode')
        .where('r.post_id = :postId', { postId })
        .andWhere('r.user_id = :userId', { userId: viewerUserId })
        .getRawMany<{ typeCode: string }>();
      myReactionCodes = mine.map((r) => r.typeCode);
    }

    return {
      reactionCounts,
      myReactionCodes,
      shareCount: reactionCounts.SHARE ?? 0,
    };
  }

  private async getPostCommentCount(postId: string): Promise<number> {
    return this.commentsRepo.count({ where: { postId } });
  }

  async listReactionTypes(): Promise<{ code: string; name: string; media: string | null; useFor: string }[]> {
    const types = await this.reactTypesRepo.find({ order: { code: 'ASC' } });
    return types.map((t) => ({
      code: t.code,
      name: t.name,
      media: t.media,
      useFor: t.useFor,
    }));
  }

  async listPostReactors(postId: string, viewerUserId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, viewerUserId)) throw new NotFoundException('Post not found');

    const rows = await this.reactsRepo
      .createQueryBuilder('r')
      .leftJoin('react_types', 'rt', 'rt.id = r.type_id')
      .leftJoin('users', 'u', 'u.id = r.user_id')
      .leftJoin('member_profiles', 'mp', 'mp.user_id = u.id')
      .select('COALESCE(mp.display_name, mp.username)', 'displayName')
      .addSelect('rt.code', 'reactionCode')
      .addSelect('rt.name', 'reactionName')
      .where('r.post_id = :postId', { postId })
      .andWhere('rt.code != :share', { share: 'SHARE' })
      .orderBy('r.created_at', 'DESC')
      .getRawMany<{ displayName: string | null; reactionCode: string; reactionName: string }>();

    return {
      total: rows.length,
      items: rows.map((r) => ({
        displayName: r.displayName ?? 'Member',
        reactionCode: r.reactionCode,
        reactionName: r.reactionName,
      })),
    };
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
    await this.mediaMigrationWorker.enqueuePostMediaMigration(post.id);
    return this.serializePost(post, { commentCount: 0, shareCount: 0 });
  }

  async updatePost(userId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Not your post');
    if (post.status === 'DELETED') throw new NotFoundException('Post not found');
    if (post.status !== 'DRAFT') throw new ForbiddenException('Only draft posts can be edited');
    if (dto.status && dto.status !== 'DRAFT') {
      throw new ForbiddenException('Use publish endpoint to publish a draft');
    }
    if (dto.title !== undefined) post.title = dto.title.trim();
    if (dto.contentHtml !== undefined) post.contentHtml = sanitizePostHtml(dto.contentHtml);
    if (dto.visibility !== undefined) post.visibility = dto.visibility;
    if (dto.status !== undefined) post.status = dto.status as PostStatus;
    if (dto.category !== undefined) post.category = dto.category?.trim() ?? null;
    if (dto.media !== undefined) post.mediaJson = dto.media.length ? JSON.stringify(dto.media) : null;
    if (dto.tags !== undefined) post.tagsJson = dto.tags.length ? JSON.stringify(dto.tags) : null;
    if (dto.location !== undefined) {
      post.locationJson = dto.location ? JSON.stringify(dto.location) : null;
    }
    await this.postsRepo.save(post);
    await this.mediaMigrationWorker.enqueuePostMediaMigration(post.id);
    const meta = await this.getPostReactionMeta(post.id, userId);
    const commentCount = await this.getPostCommentCount(post.id);
    return this.serializePost(post, { ...meta, commentCount });
  }

  async softDeletePost(userId: string, postId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Not your post');
    if (post.status === 'DELETED') return { ok: true as const };
    post.status = 'DELETED';
    await this.postsRepo.save(post);
    return { ok: true as const };
  }

  async publishPost(userId: string, postId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.userId !== userId) throw new ForbiddenException('Not your post');
    if (post.status === 'DELETED') throw new NotFoundException('Post not found');
    if (post.status !== 'DRAFT') throw new ForbiddenException('Only draft posts can be published');

    post.status = 'PUBLISHED';
    await this.postsRepo.save(post);

    const meta = await this.getPostReactionMeta(post.id, userId);
    const commentCount = await this.getPostCommentCount(post.id);
    return this.serializePost(post, { ...meta, commentCount });
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
    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }

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
        const commentCount = await this.getPostCommentCount(p.id);
        return this.serializePost(p, { ...meta, commentCount });
      }),
    );

    return { items: payloads, nextCursor };
  }

  async findOne(postId: string, viewerUserId: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, viewerUserId)) throw new NotFoundException('Post not found');

    const meta = await this.getPostReactionMeta(post.id, viewerUserId);
    const commentCount = await this.getPostCommentCount(post.id);
    return this.serializePost(post, { ...meta, commentCount });
  }

  async togglePostReaction(userId: string, postId: string, typeCode: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, userId)) throw new NotFoundException('Post not found');
    this.ensurePostPublishedForInteraction(post);

    const rtype = await this.reactTypesRepo.findOne({ where: { code: typeCode } });
    if (!rtype) throw new NotFoundException('Reaction type not found');
    validateReactTypeForTarget(rtype.useFor, 'POST');

    const existingByPost = await this.reactsRepo.findOne({
      where: { userId, postId },
    });
    if (existingByPost) {
      if (existingByPost.typeId === rtype.id) {
        await this.reactsRepo.remove(existingByPost);
        const meta = await this.getPostReactionMeta(postId, userId);
        const commentCount = await this.getPostCommentCount(post.id);
        const eventAt = new Date().toISOString();
        if (typeCode === 'SHARE') {
          this.realtimeGateway.emitPostShared({
            postId,
            toggledOn: false,
            reactionCounts: meta.reactionCounts,
            shareCount: meta.shareCount,
            postUpdatedAt: post.updatedAt.toISOString(),
            eventAt,
          });
        } else {
          this.realtimeGateway.emitPostReacted({
            postId,
            toggledOn: false,
            typeCode,
            reactionCounts: meta.reactionCounts,
            commentCount,
            shareCount: meta.shareCount,
            postUpdatedAt: post.updatedAt.toISOString(),
            eventAt,
          });
        }
        return {
          toggledOn: false as const,
          post: this.serializePost(post, { ...meta, commentCount }),
        };
      }
      existingByPost.typeId = rtype.id;
      await this.reactsRepo.save(existingByPost);
      const meta = await this.getPostReactionMeta(postId, userId);
      const commentCount = await this.getPostCommentCount(post.id);
      const eventAt = new Date().toISOString();
      if (typeCode === 'SHARE') {
        this.realtimeGateway.emitPostShared({
          postId,
          toggledOn: true,
          reactionCounts: meta.reactionCounts,
          shareCount: meta.shareCount,
          postUpdatedAt: post.updatedAt.toISOString(),
          eventAt,
        });
      } else {
        this.realtimeGateway.emitPostReacted({
          postId,
          toggledOn: true,
          typeCode,
          reactionCounts: meta.reactionCounts,
          commentCount,
          shareCount: meta.shareCount,
          postUpdatedAt: post.updatedAt.toISOString(),
          eventAt,
        });
      }
      return { toggledOn: true as const, post: this.serializePost(post, { ...meta, commentCount }) };
    }

    const row = this.reactsRepo.create({ userId, postId, commentId: null, typeId: rtype.id });
    await this.reactsRepo.save(row);
    const meta = await this.getPostReactionMeta(postId, userId);
    const commentCount = await this.getPostCommentCount(post.id);
    const eventAt = new Date().toISOString();
    if (typeCode === 'SHARE') {
      this.realtimeGateway.emitPostShared({
        postId,
        toggledOn: true,
        reactionCounts: meta.reactionCounts,
        shareCount: meta.shareCount,
        postUpdatedAt: post.updatedAt.toISOString(),
        eventAt,
      });
    } else {
      this.realtimeGateway.emitPostReacted({
        postId,
        toggledOn: true,
        typeCode,
        reactionCounts: meta.reactionCounts,
        commentCount,
        shareCount: meta.shareCount,
        postUpdatedAt: post.updatedAt.toISOString(),
        eventAt,
      });
    }
    return { toggledOn: true as const, post: this.serializePost(post, { ...meta, commentCount }) };
  }

  async sharePost(userId: string, postId: string) {
    return this.togglePostReaction(userId, postId, 'SHARE');
  }

  async setHeartReaction(userId: string, postId: string) {
    return this.togglePostReaction(userId, postId, 'HEART');
  }

  async addComment(userId: string, postId: string, dto: CreateCommentDto) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, userId)) throw new NotFoundException('Post not found');
    this.ensurePostPublishedForInteraction(post);

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
    const payload = {
      id: comment.id,
      postId: comment.postId,
      displayName: 'Bạn',
      content: comment.content,
      parentCommentId: comment.parentCommentId,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
    const commentCount = await this.getPostCommentCount(postId);
    this.realtimeGateway.emitCommentCreated({
      postId,
      comment: payload,
      commentCount,
      eventAt: new Date().toISOString(),
    });
    return payload;
  }

  async listComments(postId: string, viewerUserId: string, query: QueryCommentsDto) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, viewerUserId)) throw new NotFoundException('Post not found');
    this.ensurePostPublishedForInteraction(post);

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

    const profiles = items.length
      ? await this.commentsRepo
          .createQueryBuilder('c')
          .leftJoin('c.user', 'u')
          .leftJoin('u.memberProfile', 'mp')
          .select('c.id', 'id')
          .addSelect('COALESCE(mp.display_name, mp.username)', 'displayName')
          .where('c.id IN (:...ids)', { ids: items.map((i) => i.id) })
          .getRawMany<{ id: string; displayName: string | null }>()
      : [];
    const profileMap = new Map(profiles.map((p) => [p.id, p.displayName ?? 'Member']));

    const serialized = items.map((c) => ({
      id: c.id,
      displayName: profileMap.get(c.id) ?? 'Member',
      postId: c.postId,
      content: c.content,
      parentCommentId: c.parentCommentId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
    const roots = serialized.filter((c) => !c.parentCommentId);
    const repliesByParent = serialized
      .filter((c) => !!c.parentCommentId)
      .reduce<Record<string, typeof serialized>>((acc, c) => {
        const parentId = c.parentCommentId as string;
        acc[parentId] = acc[parentId] ? [...acc[parentId], c] : [c];
        return acc;
      }, {});
    const threaded = roots.map((root) => ({
      ...root,
      replies: (repliesByParent[root.id] ?? []).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)),
    }));

    return { items: serialized, threaded, nextCursor };
  }

  async toggleCommentReaction(userId: string, postId: string, commentId: string, typeCode: string) {
    const post = await this.postsRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (!this.canViewPost(post, userId)) throw new NotFoundException('Post not found');
    this.ensurePostPublishedForInteraction(post);

    const comment = await this.commentsRepo.findOne({ where: { id: commentId } });
    if (!comment || comment.postId !== postId) throw new NotFoundException('Comment not found');

    const rtype = await this.reactTypesRepo.findOne({ where: { code: typeCode } });
    if (!rtype) throw new NotFoundException('Reaction type not found');
    validateReactTypeForTarget(rtype.useFor, 'COMMENT');

    const existing = await this.reactsRepo.findOne({
      where: { userId, commentId, typeId: rtype.id },
    });
    if (existing) {
      await this.reactsRepo.remove(existing);
      this.realtimeGateway.emitCommentReacted({
        postId,
        commentId,
        toggledOn: false,
        typeCode,
        eventAt: new Date().toISOString(),
      });
      return { toggledOn: false as const, commentId };
    }
    const row = this.reactsRepo.create({ userId, postId: null, commentId, typeId: rtype.id });
    await this.reactsRepo.save(row);
    this.realtimeGateway.emitCommentReacted({
      postId,
      commentId,
      toggledOn: true,
      typeCode,
      eventAt: new Date().toISOString(),
    });
    return { toggledOn: true as const, commentId };
  }

  async enqueuePendingMediaMigrations(limit = 200): Promise<{ queued: number }> {
    const rows = await this.postsRepo
      .createQueryBuilder('p')
      .where('p.media_json IS NOT NULL')
      .orderBy('p.created_at', 'DESC')
      .take(limit)
      .getMany();

    let queued = 0;
    for (const row of rows) {
      if (!row.mediaJson) continue;
      const media = parseMedia(row.mediaJson);
      const hasLocal = media.some((item) => item.storage !== 'cloud' && Boolean(item.sourcePath));
      if (!hasLocal) continue;
      await this.mediaMigrationWorker.enqueuePostMediaMigration(row.id);
      queued += 1;
    }
    return { queued };
  }
}
