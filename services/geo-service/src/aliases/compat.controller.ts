import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { ClaimStatusesGuard, RequiredStatuses, Roles, RolesGuard } from '../auth/claim-statuses.guard';
import { SearchService } from '../search/search.service';
import { OsrmRoutingProvider } from '../routing/osrm.routing.provider';
import { SavedPlaceEntity } from '../entities/saved-place.entity';
import { CheckinEntity } from '../entities/checkin.entity';
import { PlaceReviewEntity } from '../entities/place-review.entity';

@Controller()
@UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
@Roles('MEMBER', 'GUEST')
@RequiredStatuses('ACTIVE')
export class CompatController {
  constructor(
    private readonly search: SearchService,
    private readonly osrm: OsrmRoutingProvider,
    @InjectRepository(SavedPlaceEntity) private readonly saved: Repository<SavedPlaceEntity>,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
    @InjectRepository(PlaceReviewEntity) private readonly reviews: Repository<PlaceReviewEntity>,
  ) {}

  @Get('locations/search')
  async locSearch(@Query('q') q: string, @Query('lat') lat?: string, @Query('lng') lng?: string) {
    const result = await this.search.search(q ?? '', {
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    });
    return result.places;
  }

  @Get('locations/nearby')
  locNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('category') category?: string,
  ) {
    return this.search.nearby(Number(lat), Number(lng), category ?? 'restaurant');
  }

  @Get('locations/driving-route')
  async driving(
    @Query('fromLat') fromLat: string,
    @Query('fromLng') fromLng: string,
    @Query('toLat') toLat: string,
    @Query('toLng') toLng: string,
  ) {
    const routes = await this.osrm.route(Number(fromLat), Number(fromLng), Number(toLat), Number(toLng), 'car', false);
    return { routes, mode: 'car' };
  }

  @Get('locations/:id')
  async locOne(@Param('id') id: string) {
    const place = await this.search.getById(id);
    if (!place) throw new NotFoundException();
    return this.search.toDto(place);
  }

  @Get('locations/:id/reviews')
  locReviews(@Param('id') id: string) {
    return this.reviews.find({ where: { placeId: id } });
  }

  @Get('saved-locations')
  mySaved(@Req() req: { user: { sub: string } }) {
    return this.saved.find({ where: { userId: req.user.sub } });
  }

  @Post('saved-locations')
  save(@Req() req: { user: { sub: string } }, @Body() body: { placeId?: string; locationId?: string }) {
    const placeId = body.placeId ?? body.locationId;
    if (!placeId) throw new NotFoundException();
    return this.saved.save(this.saved.create({ userId: req.user.sub, placeId }));
  }

  @Get('checkins')
  myCheckins(@Req() req: { user: { sub: string } }) {
    return this.checkins.find({ where: { userId: req.user.sub } });
  }

  @Post('checkins')
  checkin(
    @Req() req: { user: { sub: string } },
    @Body() body: { placeId?: string; locationId?: string; lat?: number; lng?: number },
  ) {
    const placeId = body.placeId ?? body.locationId;
    if (!placeId) throw new NotFoundException();
    return this.checkins.save(
      this.checkins.create({
        userId: req.user.sub,
        placeId,
        lat: body.lat != null ? String(body.lat) : null,
        lng: body.lng != null ? String(body.lng) : null,
      }),
    );
  }
}
