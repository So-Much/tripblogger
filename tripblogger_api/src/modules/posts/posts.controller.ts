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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryCommentsDto, QueryMinePostsDto } from './dto/query-posts.dto';
import { ToggleReactionDto } from './dto/reaction.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';
import { UploadPostMediaDto } from './dto/upload-post-media.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import { MediaResolver } from './media.resolver';
import { MediaMigrationWorker } from './media.migration.worker';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly mediaResolver: MediaResolver,
    private readonly mediaMigrationWorker: MediaMigrationWorker,
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

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Req() req: { user: { sub: string } }, @Body() dto: CreatePostDto) {
    return this.postsService.createPost(req.user.sub, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'posts'),
        filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          const extension = extname(file.originalname || '').toLowerCase() || '.bin';
          cb(null, `${Date.now()}-${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: 60 * 1024 * 1024 },
    }),
  )
  async uploadMedia(
    @Req() req: { protocol: string; headers: { host?: string; 'x-forwarded-proto'?: string } },
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

    const relativeOriginal = `/uploads/posts/${file.filename}`;
    const localSourcePath = join(process.cwd(), relativeOriginal.replace(/^\//, ''));

    let thumbnailRelative: string | undefined;
    let previewRelative: string | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let placeholder: string | undefined;

    if (kind === 'image') {
      const variantsDir = join(process.cwd(), 'uploads', 'posts', 'variants');
      if (!existsSync(variantsDir)) mkdirSync(variantsDir, { recursive: true });
      const image = sharp(localSourcePath);
      const meta = readFileSync(localSourcePath);
      const stats = await sharp(meta).metadata();
      width = stats.width;
      height = stats.height;

      const thumbName = `${file.filename}-thumb.webp`;
      const previewName = `${file.filename}-preview.webp`;
      const thumbAbsolute = join(variantsDir, thumbName);
      const previewAbsolute = join(variantsDir, previewName);
      await image.resize(320, 320, { fit: 'inside' }).webp({ quality: 72 }).toFile(thumbAbsolute);
      await sharp(localSourcePath).resize(1280, 1280, { fit: 'inside' }).webp({ quality: 82 }).toFile(previewAbsolute);
      thumbnailRelative = `/uploads/posts/variants/${thumbName}`;
      previewRelative = `/uploads/posts/variants/${previewName}`;
      placeholder = `data:${file.mimetype};base64,${meta.subarray(0, Math.min(48, meta.length)).toString('base64')}`;
    }

    const originalUrl = this.mediaResolver.toPublicUrl(relativeOriginal, reqMeta);
    const previewUrl = previewRelative ? this.mediaResolver.toPublicUrl(previewRelative, reqMeta) : undefined;
    const thumbnailUrl = thumbnailRelative ? this.mediaResolver.toPublicUrl(thumbnailRelative, reqMeta) : undefined;

    return {
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
      caption: dto?.caption ?? null,
      storage: 'local' as const,
      sourcePath: relativeOriginal,
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
  accessSignedMedia(
    @Query('p') encodedPath: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    if (!encodedPath || !exp || !sig) throw new BadRequestException('Missing signed media params');
    const mediaPath = decodeURIComponent(encodedPath);
    this.mediaResolver.verifySignedPath(mediaPath, exp, sig);
    const absolute = join(process.cwd(), mediaPath.replace(/^\//, ''));
    if (!existsSync(absolute)) throw new BadRequestException('Media not found');
    res.sendFile(absolute);
  }
}
