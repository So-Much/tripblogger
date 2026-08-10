import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripsService } from './trips.service';

type AuthRequest = Request & { user: { sub: string } };

@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
@Roles('MEMBER')
@RequiredStatuses('ACTIVE')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateTripDto) {
    return this.tripsService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.tripsService.findAll(req.user.sub);
  }

  @Get(':tripId')
  findOne(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.tripsService.findOne(req.user.sub, tripId);
  }
}
