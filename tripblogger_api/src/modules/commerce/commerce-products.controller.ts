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
import { memoryStorage } from 'multer';
import { IdempotencyInterceptor } from '@tripblogger/observability';
import { MediaUploadService } from '../../config/storage/media-upload.service';
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
    private readonly mediaUpload: MediaUploadService,
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
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } }))
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

    const stored = await this.mediaUpload.storeMedia('commerce', file, kind);
    const { width, height, placeholder } = stored;
    const relativeOriginal = stored.originalPath;
    const originalUrl = this.mediaResolver.toPublicUrl(relativeOriginal, reqMeta);
    const previewUrl = stored.previewPath ? this.mediaResolver.toPublicUrl(stored.previewPath, reqMeta) : undefined;
    const thumbnailUrl = stored.thumbnailPath ? this.mediaResolver.toPublicUrl(stored.thumbnailPath, reqMeta) : undefined;

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
      storage: this.mediaUpload.driver === 's3' ? ('cloud' as const) : ('local' as const),
      sourcePath: relativeOriginal,
    };
  }

  @Get()
  findPublic(@Req() req: Request, @Query() query: QueryPublicProductsDto) {
    return this.commerceService.findPublic(query, this.reqMeta(req));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @UseInterceptors(IdempotencyInterceptor)
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
