import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { MediaResolver } from '../posts/media.resolver';
import { UploadPostMediaDto } from '../posts/dto/upload-post-media.dto';
import { CommerceService, CommerceReqMeta } from './commerce.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryMyProductsDto, QueryPublicProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import type { Request } from 'express';

type AuthedRequest = Request & { user: { sub: string } };

@Controller('commerce/products')
export class CommerceProductsController {
  constructor(
    private readonly commerceService: CommerceService,
    private readonly mediaResolver: MediaResolver,
  ) {}

  private reqMeta(req: { protocol: string; headers: { host?: string; 'x-forwarded-proto'?: string } }): CommerceReqMeta {
    return {
      protocol: req.protocol,
      host: req.headers.host,
      forwardedProto: req.headers['x-forwarded-proto'] as string | undefined,
    };
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  findMine(@Req() req: AuthedRequest, @Query() query: QueryMyProductsDto) {
    return this.commerceService.findMine(req.user.sub, query, this.reqMeta(req));
  }

  @Post('media')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'commerce'),
        filename: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          const extension = extname(file.originalname || '').toLowerCase() || '.bin';
          cb(null, `${Date.now()}-${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: 60 * 1024 * 1024 },
    }),
  )
  async uploadMedia(
    @Req() req: Request,
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
    const reqMeta = this.reqMeta(req);

    const relativeOriginal = `/uploads/commerce/${file.filename}`;
    const localSourcePath = join(process.cwd(), relativeOriginal.replace(/^\//, ''));

    let thumbnailRelative: string | undefined;
    let previewRelative: string | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let placeholder: string | undefined;

    if (kind === 'image') {
      const variantsDir = join(process.cwd(), 'uploads', 'commerce', 'variants');
      if (!existsSync(variantsDir)) mkdirSync(variantsDir, { recursive: true });
      const meta = readFileSync(localSourcePath);
      const stats = await sharp(meta).metadata();
      width = stats.width;
      height = stats.height;

      const thumbName = `${file.filename}-thumb.webp`;
      const previewName = `${file.filename}-preview.webp`;
      const thumbAbsolute = join(variantsDir, thumbName);
      const previewAbsolute = join(variantsDir, previewName);
      await sharp(localSourcePath).resize(320, 320, { fit: 'inside' }).webp({ quality: 72 }).toFile(thumbAbsolute);
      await sharp(localSourcePath).resize(1280, 1280, { fit: 'inside' }).webp({ quality: 82 }).toFile(previewAbsolute);
      thumbnailRelative = `/uploads/commerce/variants/${thumbName}`;
      previewRelative = `/uploads/commerce/variants/${previewName}`;
      const tiny = await sharp(localSourcePath).resize(24, 24, { fit: 'inside' }).webp({ quality: 35 }).toBuffer();
      placeholder = `data:image/webp;base64,${tiny.toString('base64')}`;
    }

    const originalUrl = this.mediaResolver.toPublicUrl(relativeOriginal, reqMeta);
    const previewUrl = previewRelative ? this.mediaResolver.toPublicUrl(previewRelative, reqMeta) : undefined;
    const thumbnailUrl = thumbnailRelative ? this.mediaResolver.toPublicUrl(thumbnailRelative, reqMeta) : undefined;

    return {
      type: kind,
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

  @Get()
  findPublic(@Req() req: Request, @Query() query: QueryPublicProductsDto) {
    return this.commerceService.findPublic(query, this.reqMeta(req));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Req() req: AuthedRequest, @Body() dto: CreateProductDto) {
    return this.commerceService.createProduct(req.user.sub, dto, this.reqMeta(req));
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Req() req: Request & { user?: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.commerceService.findOne(id, req.user?.sub, this.reqMeta(req));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  update(
    @Req() req: AuthedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.commerceService.updateProduct(req.user.sub, id, dto, this.reqMeta(req));
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  publish(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.commerceService.publishProduct(req.user.sub, id, this.reqMeta(req));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  remove(@Req() req: AuthedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.commerceService.softDeleteProduct(req.user.sub, id);
  }
}
