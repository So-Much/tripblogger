import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  Headers,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryPostsNearLocationDto } from './dto/query-posts-near-location.dto';
import { QueryCommentsDto, QueryFeedPostsDto, QueryMinePostsDto } from './dto/query-posts.dto';
import { ToggleReactionDto } from './dto/reaction.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';
import { UploadPostMediaDto } from './dto/upload-post-media.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { IdempotencyInterceptor } from '@tripblogger/observability';
import { MediaResolver } from './media.resolver';
import { MediaMigrationWorker } from './media.migration.worker';
import { MediaUploadService } from '../../config/storage/media-upload.service';
import { keyFromUploadPath, OBJECT_STORAGE, type ObjectStorage } from '../../config/storage/object-storage';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly mediaResolver: MediaResolver,
    private readonly mediaMigrationWorker: MediaMigrationWorker,
    private readonly mediaUpload: MediaUploadService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  @Get('reaction-types')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listReactionTypes() {
    return this.postsService.listReactionTypes();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  findMine(@Req() req: { user: { sub: string } }, @Query() query: QueryMinePostsDto) {
    return this.postsService.findMine(req.user.sub, query);
  }

  @Get('mine/near')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  findMineNear(@Req() req: { user: { sub: string } }, @Query() query: QueryPostsNearLocationDto) {
    return this.postsService.findMineNear(req.user.sub, query);
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  findFeed(@Req() req: { user: { sub: string } }, @Query() query: QueryFeedPostsDto) {
    return this.postsService.findFeed(req.user.sub, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Req() req: { user: { sub: string } }, @Body() dto: CreatePostDto) {
    return this.postsService.createPost(req.user.sub, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  findOne(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  update(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(req.user.sub, id, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  publish(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.publishPost(req.user.sub, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  remove(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.softDeletePost(req.user.sub, id);
  }

  @Post(':id/reactions')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  toggleReaction(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.postsService.togglePostReaction(req.user.sub, id, dto.typeCode);
  }

  @Post(':id/reactions/heart')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  heart(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.setHeartReaction(req.user.sub, id);
  }

  @Get(':id/reactions/actors')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listReactors(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.listPostReactors(id, req.user.sub);
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  share(@Req() req: { user: { sub: string } }, @Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.sharePost(req.user.sub, id);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  addComment(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.addComment(req.user.sub, id, dto);
  }

  @Get(':id/comments')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listComments(
    @Req() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryCommentsDto,
  ) {
    return this.postsService.listComments(id, req.user.sub, query);
  }

  @Post(':postId/comments/:commentId/reactions')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  toggleCommentReaction(
    @Req() req: { user: { sub: string } },
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.postsService.toggleCommentReaction(req.user.sub, postId, commentId, dto.typeCode);
  }

  @Post('media')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } }))
  async uploadMedia(
    @Req() req: {
      user: { sub: string };
      protocol: string;
      headers: { host?: string; 'x-forwarded-proto'?: string };
    },
    @UploadedFile() file?: Express.Multer.File,
    @Body() dto?: UploadPostMediaDto,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const kind = dto?.kind ?? (file.mimetype.startsWith('video/') ? 'video' : 'image');
    if (kind === 'image' && !file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Expected image file');
    }
    if (kind === 'video' && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Expected video file');
    }
    const reqMeta = {
      protocol: req.protocol,
      host: req.headers.host,
      forwardedProto: req.headers['x-forwarded-proto'],
    };

    const stored = await this.mediaUpload.storeMedia('posts', file, kind);
    const { width, height, placeholder } = stored;
    const relativeOriginal = stored.originalPath;
    const originalUrl = this.mediaResolver.toPublicUrl(relativeOriginal, reqMeta);
    const previewUrl = stored.previewPath ? this.mediaResolver.toPublicUrl(stored.previewPath, reqMeta) : undefined;
    const thumbnailUrl = stored.thumbnailPath ? this.mediaResolver.toPublicUrl(stored.thumbnailPath, reqMeta) : undefined;

    const registered = await this.postsService.registerUploadedMedia(req.user.sub, {
      kind,
      url: previewUrl ?? originalUrl,
      thumbnailUrl,
      previewUrl,
      originalUrl,
      mimeType: file.mimetype,
      size: file.size,
      width,
      height,
      placeholder,
      storage: this.storage.driver === 's3' ? 'cloud' : 'local',
      sourcePath: relativeOriginal,
    });

    return {
      ...registered,
      caption: dto?.caption ?? null,
    };
  }

  @Post('media/migrate')
  enqueueMediaMigration(
    @Headers('x-admin-secret') adminSecret: string | undefined,
    @Query('limit') limit?: string,
  ) {
    const expected = process.env.ADMIN_SECRET;
    if (!expected || !adminSecret || adminSecret !== expected) throw new BadRequestException('Unauthorized');
    const parsedLimit = limit ? Math.max(1, Math.min(1000, Number(limit))) : 200;
    return this.postsService.enqueuePendingMediaMigrations(Number.isFinite(parsedLimit) ? parsedLimit : 200);
  }

  @Get('media/access')
  async accessSignedMedia(
    @Query('p') encodedPath: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    if (!encodedPath || !exp || !sig) throw new BadRequestException('Missing signed media params');
    const mediaPath = decodeURIComponent(encodedPath);
    this.mediaResolver.verifySignedPath(mediaPath, exp, sig);
    const key = keyFromUploadPath(mediaPath);
    const object = key ? await this.storage.get(key) : null;
    if (!object) throw new BadRequestException('Media not found');
    if (object.contentType) res.setHeader('Content-Type', object.contentType);
    if (object.contentLength) res.setHeader('Content-Length', String(object.contentLength));
    res.setHeader('Cache-Control', 'private, max-age=600');
    object.body.pipe(res);
  }
}
