import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CheckinsService } from './checkins.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { QueryCheckinsDto } from './dto/query-checkins.dto';

type AuthRequest = Request & { user: { sub: string } };

@Controller('checkins')
export class CheckinsController {
  constructor(private readonly checkinsService: CheckinsService) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listMine(@Req() req: AuthRequest, @Query() query: QueryCheckinsDto) {
    return this.checkinsService.listMine(req.user.sub, query.locationId, query.limit ?? 20);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Req() req: AuthRequest, @Body() dto: CreateCheckinDto) {
    return this.checkinsService.create(req.user.sub, dto);
  }
}
