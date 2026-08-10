import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CreateTripDto } from './dto/create-trip.dto';
import { PatchDayDto } from './dto/patch-day.dto';
import { PatchTripDto } from './dto/patch-trip.dto';
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

  @Patch(':tripId')
  patch(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: PatchTripDto,
  ) {
    return this.tripsService.patch(req.user.sub, tripId, dto);
  }

  @Patch(':tripId/days/:dayId')
  patchDay(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: PatchDayDto,
  ) {
    return this.tripsService.patchDay(req.user.sub, tripId, dayId, dto);
  }

  @Delete(':tripId')
  remove(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.tripsService.remove(req.user.sub, tripId);
  }
}
