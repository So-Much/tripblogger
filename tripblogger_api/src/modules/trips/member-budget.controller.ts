import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { UsersService } from '../users/users.service';

class PutMemberBudgetDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number | null;

  @IsOptional()
  @IsString()
  currency?: string;
}

type AuthRequest = Request & { user: { sub: string } };

/** Same `/trips/budget` shape as Trip Service, stored on the member profile while Core still owns trips. */
@Controller('trips/budget')
@UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
@Roles('MEMBER')
@RequiredStatuses('ACTIVE')
export class MemberBudgetController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async get(@Req() req: AuthRequest) {
    const me = await this.users.getMeProfile(req.user.sub);
    return {
      amount: me.profile?.totalTravelBudgetAmount ?? null,
      currency: me.profile?.totalTravelBudgetCurrency ?? null,
    };
  }

  @Put()
  async put(@Req() req: AuthRequest, @Body() dto: PutMemberBudgetDto) {
    await this.users.updateMyProfile(req.user.sub, {
      totalTravelBudgetAmount: dto.amount ?? null,
      totalTravelBudgetCurrency: dto.currency,
    });
    return this.get(req);
  }
}
