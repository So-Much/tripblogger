import {
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
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import {
  ChangeTripDatesDto,
  CreateAccommodationDto,
  CreateStopDto,
  CreateTripDto,
  InviteMemberDto,
  LinkTripPostDto,
  QueryTripsDto,
  ReorderStopsDto,
  TransferOwnerDto,
  UpdateMemberDto,
  UpdateStopDto,
  UpdateTripDayDto,
  UpdateTripDto,
  UpdateTripStatusDto,
} from './dto/trip.dto';
import { TripAccommodationsService } from './trip-accommodations.service';
import { TripDaysService } from './trip-days.service';
import { TripMembersService } from './trip-members.service';
import { TripPostsService } from './trip-posts.service';
import { TripStopsService } from './trip-stops.service';
import { RecommendationService } from './recommendation.service';
import { TripsService } from './trips.service';

type AuthRequest = Request & { user: { sub: string } };

@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly membersService: TripMembersService,
    private readonly daysService: TripDaysService,
    private readonly stopsService: TripStopsService,
    private readonly accomService: TripAccommodationsService,
    private readonly tripPostsService: TripPostsService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get(':tripId/recommendations')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listRecommendations(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationService.list(
      tripId,
      req.user.sub,
      category,
      limit ? Number(limit) : 20,
    );
  }

  @Post(':tripId/recommendations/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  refreshRecommendations(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.recommendationService.refresh(tripId, req.user.sub);
  }

  @Patch(':tripId/recommendations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  patchRecommendation(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isDismissed?: boolean; isAdded?: boolean },
  ) {
    if (body.isDismissed) return this.recommendationService.dismiss(tripId, id, req.user.sub);
    if (body.isAdded) return this.recommendationService.markAdded(tripId, id, req.user.sub);
    return { ok: true };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Req() req: AuthRequest, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listMine(@Req() req: AuthRequest, @Query() query: QueryTripsDto) {
    return this.tripsService.findMine(req.user.sub, query);
  }

  @Get('explore')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  explore(@Query() query: QueryTripsDto) {
    return this.tripsService.explore(query);
  }

  @Get(':tripId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  detail(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.tripsService.getTripDetail(tripId, req.user.sub);
  }

  @Patch(':tripId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  update(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.updateTrip(tripId, req.user.sub, dto);
  }

  @Patch(':tripId/dates')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  changeDates(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: ChangeTripDatesDto,
  ) {
    return this.tripsService.changeTripDates(tripId, req.user.sub, dto);
  }

  @Delete(':tripId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  remove(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.tripsService.deleteTrip(tripId, req.user.sub);
  }

  @Patch(':tripId/status')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  updateStatus(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: UpdateTripStatusDto,
  ) {
    return this.tripsService.updateStatus(tripId, req.user.sub, dto);
  }

  @Post(':tripId/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  duplicate(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.tripsService.duplicateTrip(tripId, req.user.sub);
  }

  @Get(':tripId/members')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listMembers(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.membersService.list(tripId, req.user.sub);
  }

  @Post(':tripId/members')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  invite(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.invite(tripId, req.user.sub, dto);
  }

  @Patch(':tripId/members/:memberId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  updateMember(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(tripId, memberId, req.user.sub, dto);
  }

  @Delete(':tripId/members/:memberId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  removeMember(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.membersService.remove(tripId, memberId, req.user.sub);
  }

  @Post(':tripId/members/transfer')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  transfer(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: TransferOwnerDto,
  ) {
    return this.membersService.transfer(tripId, req.user.sub, dto);
  }

  @Get(':tripId/accommodations')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listAccom(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.accomService.list(tripId, req.user.sub);
  }

  @Post(':tripId/accommodations')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  addAccom(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: CreateAccommodationDto,
  ) {
    return this.accomService.create(tripId, req.user.sub, dto);
  }

  @Patch(':tripId/accommodations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  patchAccom(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAccommodationDto,
  ) {
    return this.accomService.update(tripId, id, req.user.sub, dto);
  }

  @Delete(':tripId/accommodations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  deleteAccom(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.accomService.remove(tripId, id, req.user.sub);
  }

  @Get(':tripId/days')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listDays(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.daysService.list(tripId, req.user.sub);
  }

  @Get(':tripId/days/:dayId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  getDay(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
  ) {
    return this.daysService.getOne(tripId, dayId, req.user.sub);
  }

  @Patch(':tripId/days/:dayId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  patchDay(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: UpdateTripDayDto,
  ) {
    return this.daysService.update(tripId, dayId, req.user.sub, dto);
  }

  @Get(':tripId/days/:dayId/stops')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listStops(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
  ) {
    return this.stopsService.listByDay(tripId, dayId, req.user.sub);
  }

  @Post(':tripId/days/:dayId/stops')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  addStop(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: CreateStopDto,
  ) {
    return this.stopsService.addStop(tripId, dayId, req.user.sub, dto);
  }

  @Patch(':tripId/stops/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  reorderStops(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: ReorderStopsDto,
  ) {
    return this.stopsService.reorder(tripId, req.user.sub, dto);
  }

  @Patch(':tripId/stops/:stopId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  patchStop(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @Body() dto: UpdateStopDto,
  ) {
    return this.stopsService.updateStop(tripId, stopId, req.user.sub, dto);
  }

  @Delete(':tripId/stops/:stopId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  deleteStop(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
  ) {
    return this.stopsService.deleteStop(tripId, stopId, req.user.sub);
  }

  @Post(':tripId/stops/:stopId/checkin')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  checkin(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
  ) {
    return this.stopsService.checkin(tripId, stopId, req.user.sub);
  }

  @Post(':tripId/stops/:stopId/complete')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  complete(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
  ) {
    return this.stopsService.complete(tripId, stopId, req.user.sub);
  }

  @Post(':tripId/stops/:stopId/skip')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  skip(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
  ) {
    return this.stopsService.skip(tripId, stopId, req.user.sub);
  }

  @Get(':tripId/posts')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listPosts(@Req() req: AuthRequest, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.tripPostsService.list(tripId, req.user.sub);
  }

  @Post(':tripId/posts')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  linkPost(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: LinkTripPostDto,
  ) {
    return this.tripPostsService.link(tripId, req.user.sub, dto.postId);
  }

  @Delete(':tripId/posts/:postId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  unlinkPost(
    @Req() req: AuthRequest,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.tripPostsService.unlink(tripId, req.user.sub, postId);
  }
}
