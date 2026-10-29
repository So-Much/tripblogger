import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CouponsService } from './coupons.service';
import { ValidateCouponDto } from './dto/shopping.dto';

type AuthedRequest = Request & { user: { sub: string } };

@Controller('commerce/coupons')
export class CouponsPublicController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  validate(@Req() req: AuthedRequest, @Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(
      dto.code,
      dto.cartSubTotal,
      dto.categoryIds ?? [],
      dto.productIds ?? [],
      req.user.sub,
    );
  }

  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  available(@Query('cartSubTotal') sub?: string) {
    const n = sub != null ? parseFloat(sub) : undefined;
    return this.couponsService.listAvailable(Number.isFinite(n) ? n : undefined);
  }
}
