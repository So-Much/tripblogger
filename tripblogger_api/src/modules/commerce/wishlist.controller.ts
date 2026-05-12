import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { WishlistService } from './wishlist.service';

type AuthedRequest = Request & { user: { sub: string } };

@Controller('commerce/wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  private reqMeta(req: Request) {
    return {
      protocol: req.protocol,
      host: req.headers.host,
      forwardedProto: req.headers['x-forwarded-proto'] as string | undefined,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  list(@Req() req: AuthedRequest, @Query('limit') limitStr?: string, @Query('cursor') cursor?: string) {
    const limit = Math.min(50, Math.max(1, parseInt(limitStr ?? '20', 10) || 20));
    return this.wishlistService.list(req.user.sub, limit, cursor, this.reqMeta(req));
  }

  @Post(':productId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  toggle(@Req() req: AuthedRequest, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.wishlistService.toggle(req.user.sub, productId);
  }
}
