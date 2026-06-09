import {
  Body,
  Controller,
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
import { CreateLocationReviewDto, UpdateLocationReviewDto } from './dto/create-location-review.dto';
import { CreateLocationDto, UpsertFromPlaceDto } from './dto/create-location.dto';
import { QueryLocationsSearchDto } from './dto/query-locations.dto';
import { QueryLocationsNearbyDto } from './dto/query-locations-nearby.dto';
import { QueryDrivingRouteDto } from './dto/query-driving-route.dto';
import { QueryLocationReviewsDto } from './dto/query-location-reviews.dto';
import { LocationReviewsService } from './location-reviews.service';
import { LocationsService } from './locations.service';

type AuthRequest = Request & { user: { sub: string } };

@Controller('locations')
export class LocationsController {
  constructor(
    private readonly locationsService: LocationsService,
    private readonly reviewsService: LocationReviewsService,
  ) {}

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  search(@Query() query: QueryLocationsSearchDto) {
    return this.locationsService.search(
      query.q,
      query.type,
      query.lat,
      query.lng,
      query.limit ?? 20,
    );
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  nearby(@Query() query: QueryLocationsNearbyDto) {
    return this.locationsService.nearby(
      query.lat,
      query.lng,
      query.radiusKm ?? 10,
      query.sort ?? 'rating',
      query.limit ?? 30,
      query.typeCode,
      query.typeCodes,
    );
  }

  @Get('driving-route')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  drivingRoute(@Query() query: QueryDrivingRouteDto) {
    return this.locationsService.drivingRoute(
      query.fromLat,
      query.fromLng,
      query.toLat,
      query.toLng,
    );
  }

  @Get(':id/reviews/summary')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  reviewSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.summary(id);
  }

  @Get(':id/reviews/mine')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  myReview(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.findMine(id, req.user.sub);
  }

  @Get(':id/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listReviews(@Param('id', ParseUUIDPipe) id: string, @Query() query: QueryLocationReviewsDto) {
    return this.reviewsService.list(id, query.sort ?? 'recent', query.page ?? 1, query.limit ?? 10);
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  createReview(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLocationReviewDto,
  ) {
    return this.reviewsService.create(id, req.user.sub, dto);
  }

  @Patch(':id/reviews/:reviewId')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  updateReview(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: UpdateLocationReviewDto,
  ) {
    return this.reviewsService.update(id, reviewId, req.user.sub, dto);
  }

  @Get(':id/media')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  listMedia(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.listMedia(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  getById(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.findById(id, req.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Post('upsert-from-place')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  upsertFromPlace(@Body() dto: UpsertFromPlaceDto) {
    return this.locationsService.upsertFromPlace(dto);
  }
}
