import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { ClaimStatusesGuard, RequiredStatuses, Roles, RolesGuard } from '../auth/claim-statuses.guard';
import { AddStopDto } from './dto/add-stop.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { MoveStopDto } from './dto/move-stop.dto';
import { PatchDayDto } from './dto/patch-day.dto';
import { PatchStopDto } from './dto/patch-stop.dto';
import { PatchTripDto } from './dto/patch-trip.dto';
import { TripsService } from './trips.service';

type AuthRequest = Request & { user: { sub: string } };

function parseVersion(ifMatch?: string, bodyVersion?: number): number | undefined {
  if (typeof bodyVersion === 'number') return bodyVersion;
  if (!ifMatch) return undefined;
  const n = Number(String(ifMatch).replace(/"/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

@Controller('trips')
@UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
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
    @Body() dto: PatchTripDto & { expectedVersion?: number },
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.tripsService.patch(req.user.sub, tripId, dto, parseVersion(ifMatch, dto.expectedVersion));
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

  @Post(':tripId/stops')
  addStop(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: AddStopDto & { expectedVersion?: number },
    @Headers('if-match') ifMatch?: string,
  ) {
    return this.tripsService.addStop(req.user.sub, tripId, dto, parseVersion(ifMatch, dto.expectedVersion));
  }

  @Patch(':tripId/stops/:stopId')
  patchStop(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @Body() dto: PatchStopDto,
  ) {
    return this.tripsService.patchStop(req.user.sub, tripId, stopId, dto);
  }

  @Delete(':tripId/stops/:stopId')
  deleteStop(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
  ) {
    return this.tripsService.deleteStop(req.user.sub, tripId, stopId);
  }

  @Post(':tripId/stops/:stopId/move')
  moveStop(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @Body() dto: MoveStopDto,
  ) {
    return this.tripsService.moveStop(req.user.sub, tripId, stopId, dto);
  }
}
