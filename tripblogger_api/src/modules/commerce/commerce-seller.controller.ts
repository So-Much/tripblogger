import { Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { SellerVerificationService } from './seller-verification.service';

@Controller('commerce')
export class CommerceSellerController {
  constructor(private readonly sellerVerificationService: SellerVerificationService) {}

  @Post('seller/verify')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  requestVerify(@Req() req: { user: { sub: string } }) {
    return this.sellerVerificationService.requestVerification(req.user.sub);
  }

  @Get('seller/verification-status')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  getStatus(@Req() req: { user: { sub: string } }) {
    return this.sellerVerificationService.getStatus(req.user.sub);
  }

  @Post('admin/seller/:userId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('ADMIN')
  @RequiredStatuses('ACTIVE')
  approve(@Req() req: { user: { sub: string } }, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.sellerVerificationService.approve(userId, req.user.sub);
  }

  @Post('admin/seller/:userId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('ADMIN')
  @RequiredStatuses('ACTIVE')
  reject(@Req() req: { user: { sub: string } }, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.sellerVerificationService.reject(userId, req.user.sub);
  }
}
