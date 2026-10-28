import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { normalizeVi } from '@tripblogger/contracts';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { ClaimStatusesGuard, RequiredStatuses, Roles, RolesGuard } from '../auth/claim-statuses.guard';
import { SearchService } from '../search/search.service';
import { OsrmRoutingProvider } from '../routing/osrm.routing.provider';
import { SavedPlaceEntity } from '../entities/saved-place.entity';
import { CheckinEntity } from '../entities/checkin.entity';
import { PlaceReviewEntity } from '../entities/place-review.entity';
import { PlaceEntity } from '../entities/place.entity';
import {
  summarizeReviews,
  toCheckinItem,
  toDrivingRouteDto,
  toPersistedLocation,
  toReviewDto,
  toReviewPage,
  toSavedGroups,
} from './app-contract';

type AuthRequest = { user: { sub: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    @InjectRepository(PlaceEntity) private readonly places: Repository<PlaceEntity>,
  ) {}

  @Get('locations/search')
  async locSearch(@Query('q') q: string, @Query('lat') lat?: string, @Query('lng') lng?: string) {
    const origin = lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined;
    const result = await this.search.search(q ?? '', origin);
    return result.places.map((place) => toPersistedLocation(place));
  }

  @Get('locations/nearby')
  async locNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('category') category?: string,
    @Query('typeCode') typeCode?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('limit') limit?: string,
  ) {
    const radius = radiusKm ? Number(radiusKm) * 1000 : 1500;
    const places = await this.search.nearby(
      Number(lat),
      Number(lng),
      typeCode ?? category ?? 'restaurant',
      Number.isFinite(radius) ? radius : 1500,
      limit ? Number(limit) : 40,
    );
    return places.map((place) => toPersistedLocation(place));
  }

  @Get('locations/driving-route')
  async driving(
    @Query('fromLat') fromLat: string,
    @Query('fromLng') fromLng: string,
    @Query('toLat') toLat: string,
    @Query('toLng') toLng: string,
  ) {
    const from = { lat: Number(fromLat), lng: Number(fromLng) };
    const to = { lat: Number(toLat), lng: Number(toLng) };
    const routes = await this.osrm.route(from.lat, from.lng, to.lat, to.lng, 'car', false);
    return toDrivingRouteDto(routes, from, to);
  }

  @Post('locations/upsert-from-place')
  async upsert(
    @Body()
    body: { placeId?: string; name?: string; address?: string; lat?: number; lng?: number },
  ) {
    if (!body.name || body.lat == null || body.lng == null) throw new BadRequestException('name, lat, lng required');
    const id = body.placeId && UUID_RE.test(body.placeId) ? body.placeId : randomUUID();
    let place = await this.places.findOne({ where: { id } });
    if (!place) {
      place = this.places.create({
        id,
        name: body.name,
        normalizedName: normalizeVi(body.name),
        category: 'other',
        lat: String(body.lat),
        lng: String(body.lng),
        address: body.address ?? null,
        source: 'user',
        status: 'active',
      });
    } else {
      place.name = body.name;
      place.normalizedName = normalizeVi(body.name);
      place.lat = String(body.lat);
      place.lng = String(body.lng);
      place.address = body.address ?? place.address;
    }
    const saved = await this.places.save(place);
    return toPersistedLocation(this.search.toDto(saved));
  }

  @Get('locations/:id/reviews/summary')
  async reviewSummary(@Param('id') id: string) {
    const rows = await this.reviews.find({ where: { placeId: id } });
    return summarizeReviews(rows);
  }

  @Get('locations/:id/reviews/mine')
  async myReview(@Param('id') id: string, @Req() req: AuthRequest) {
    const row = await this.reviews.findOne({ where: { placeId: id, userId: req.user.sub } });
    return row ? toReviewDto(row) : null;
  }

  @Get('locations/:id/reviews')
  async locReviews(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('sort') sort = 'recent',
  ) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
    const [rows, total] = await this.reviews.findAndCount({
      where: { placeId: id },
      order: sort === 'rating' ? { rating: 'DESC' } : { createdAt: 'DESC' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });
    return toReviewPage(rows, pageNum, limitNum, total);
  }

  @Post('locations/:id/reviews')
  async createReview(
    @Param('id') id: string,
    @Req() req: AuthRequest,
    @Body() body: { rating?: number; content?: string; tags?: string[] },
  ) {
    const place = await this.places.findOne({ where: { id } });
    if (!place) throw new NotFoundException();
    if (body.rating == null) throw new BadRequestException('rating required');
    const existing = await this.reviews.findOne({ where: { placeId: id, userId: req.user.sub } });
    const row = existing ?? this.reviews.create({ placeId: id, userId: req.user.sub, rating: body.rating });
    row.rating = body.rating;
    row.body = body.content ?? null;
    row.tagsJson = body.tags ? JSON.stringify(body.tags) : null;
    const saved = await this.reviews.save(row);
    await this.refreshRating(id);
    return toReviewDto(saved);
  }

  @Patch('locations/:id/reviews/:reviewId')
  async patchReview(
    @Param('id') id: string,
    @Param('reviewId') reviewId: string,
    @Req() req: AuthRequest,
    @Body() body: { rating?: number; content?: string; tags?: string[] },
  ) {
    const row = await this.reviews.findOne({ where: { id: reviewId, placeId: id, userId: req.user.sub } });
    if (!row) throw new NotFoundException();
    if (body.rating != null) row.rating = body.rating;
    if (body.content !== undefined) row.body = body.content;
    if (body.tags) row.tagsJson = JSON.stringify(body.tags);
    const saved = await this.reviews.save(row);
    await this.refreshRating(id);
    return toReviewDto(saved);
  }

  @Get('locations/:id/media')
  async media(@Param('id') id: string) {
    const place = await this.places.findOne({ where: { id } });
    if (!place) throw new NotFoundException();
    if (!place.imageUrl) return { items: [] };
    return {
      items: [
        {
          id: place.id,
          mediaId: place.id,
          url: place.imageUrl,
          thumbnailUrl: null,
          aestheticScore: null,
          isPrimary: true,
        },
      ],
    };
  }

  @Get('locations/:id')
  async locOne(@Param('id') id: string, @Req() req: AuthRequest) {
    const place = await this.search.getById(id);
    if (!place) throw new NotFoundException();
    const saved = await this.saved.findOne({ where: { userId: req.user.sub, placeId: id } });
    const mine = await this.reviews.findOne({ where: { placeId: id, userId: req.user.sub } });
    return {
      ...toPersistedLocation({ ...this.search.toDto(place), status: place.status }),
      savedByMe: Boolean(saved),
      savedLocationId: saved?.id ?? null,
      hasMyReview: Boolean(mine),
    };
  }

  @Get('saved-locations/collections')
  async collections(@Req() req: AuthRequest) {
    const rows = await this.saved.find({ where: { userId: req.user.sub } });
    return Array.from(new Set(rows.map((row) => row.collectionName?.trim() || 'Mặc định')));
  }

  @Get('saved-locations')
  async mySaved(@Req() req: AuthRequest) {
    const rows = await this.saved.find({ where: { userId: req.user.sub }, order: { createdAt: 'DESC' } });
    return toSavedGroups(rows);
  }

  @Post('saved-locations')
  async save(@Req() req: AuthRequest, @Body() body: { placeId?: string; locationId?: string; collectionName?: string; note?: string }) {
    const placeId = body.placeId ?? body.locationId;
    if (!placeId) throw new BadRequestException('locationId required');
    const existing = await this.saved.findOne({ where: { userId: req.user.sub, placeId } });
    if (existing) return existing;
    return this.saved.save(
      this.saved.create({
        userId: req.user.sub,
        placeId,
        collectionName: body.collectionName ?? 'Mặc định',
        note: body.note ?? null,
      }),
    );
  }

  @Patch('saved-locations/:id')
  async patchSaved(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { collectionName?: string; note?: string },
  ) {
    const row = await this.saved.findOne({ where: { id, userId: req.user.sub } });
    if (!row) throw new NotFoundException();
    if (body.collectionName) row.collectionName = body.collectionName;
    if (body.note !== undefined) row.note = body.note ?? null;
    return this.saved.save(row);
  }

  @Delete('saved-locations/:id')
  async unsave(@Req() req: AuthRequest, @Param('id') id: string) {
    const row = await this.saved.findOne({ where: { id, userId: req.user.sub } });
    if (!row) throw new NotFoundException();
    await this.saved.delete({ id, userId: req.user.sub });
    return { deleted: true };
  }

  @Get('checkins/mine')
  async myCheckins(@Req() req: AuthRequest, @Query('locationId') locationId?: string, @Query('limit') limit = '20') {
    const cap = Math.min(Number(limit) || 20, 50);
    const rows = await this.checkins.find({
      where: { userId: req.user.sub, ...(locationId ? { placeId: locationId } : {}) },
      order: { createdAt: 'DESC' },
      take: cap,
    });
    const items = [];
    for (const row of rows) {
      const place = await this.places.findOne({ where: { id: row.placeId } });
      items.push(toCheckinItem(row, place));
    }
    return { items };
  }

  @Get('checkins')
  listCheckins(@Req() req: AuthRequest, @Query('locationId') locationId?: string, @Query('limit') limit = '20') {
    return this.myCheckins(req, locationId, limit);
  }

  @Post('checkins')
  async checkin(
    @Req() req: AuthRequest,
    @Body() body: { placeId?: string; locationId?: string; lat?: number; lng?: number; latitude?: number; longitude?: number; privacyLevel?: string },
  ) {
    const placeId = body.placeId ?? body.locationId;
    if (!placeId) throw new BadRequestException('locationId required');
    const place = await this.places.findOne({ where: { id: placeId } });
    if (!place) throw new NotFoundException();
    const lat = body.lat ?? body.latitude;
    const lng = body.lng ?? body.longitude;
    const saved = await this.checkins.save(
      this.checkins.create({
        userId: req.user.sub,
        placeId,
        lat: lat != null ? String(lat) : null,
        lng: lng != null ? String(lng) : null,
        privacyLevel: body.privacyLevel ?? 'PUBLIC',
      }),
    );
    return toCheckinItem(saved, place);
  }

  private async refreshRating(placeId: string) {
    const rows = await this.reviews.find({ where: { placeId } });
    const place = await this.places.findOne({ where: { id: placeId } });
    if (!place) return;
    const summary = summarizeReviews(rows);
    place.ratingAvg = String(summary.avgRating);
    place.reviewCount = summary.total;
    await this.places.save(place);
  }
}
