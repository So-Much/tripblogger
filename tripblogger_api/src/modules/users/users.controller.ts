import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findByIdOrThrow(id);
    const statuses = await this.usersService.getActiveStatuses(id);
    return {
      id: user.id,
      role: user.role.code,
      statuses,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  async getMyProfile(@Req() req: { user: { sub: string } }) {
    return this.usersService.getMeProfile(req.user.sub);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'avatars'),
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname || '').toLowerCase() || '.jpg';
          cb(null, `${Date.now()}-${randomUUID()}${extension}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        cb(null, AVATAR_MIME.has(file.mimetype));
      },
    }),
  )
  async updateMyProfile(
    @Req() req: { user: { sub: string }; protocol: string; headers: { host?: string; 'x-forwarded-proto'?: string } },
    @UploadedFile() avatar?: { filename: string; mimetype: string },
    @Body('displayName') displayName?: string,
    @Body('removeAvatar') removeAvatarRaw?: string | boolean,
  ) {
    if (avatar && !AVATAR_MIME.has(avatar.mimetype)) {
      throw new BadRequestException('Invalid avatar format');
    }
    const removeAvatar = removeAvatarRaw === true || removeAvatarRaw === 'true' || removeAvatarRaw === '1';
    const proto = req.headers['x-forwarded-proto'] ?? req.protocol ?? 'http';
    const host = req.headers.host;
    const avatarUrl = avatar ? `${proto}://${host}/uploads/avatars/${avatar.filename}` : removeAvatar ? null : undefined;

    return this.usersService.updateMyProfile(req.user.sub, {
      displayName,
      avatarUrl,
    });
  }
}
