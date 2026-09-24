import { Controller, Get, Headers, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { POI_CATEGORIES } from '@tripblogger/contracts';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { ClaimStatusesGuard, RequiredStatuses, Roles, RolesGuard } from '../auth/claim-statuses.guard';
import { SearchService } from '../search/search.service';
import { PhotonClient } from '../geocode/photon.client';
import { OsrmRoutingProvider } from '../routing/osrm.routing.provider';
import {
  MapNearbyQueryDto,
  MapReverseQueryDto,
  MapRouteQueryDto,
  MapSearchQueryDto,
} from './map.dto';

@Controller('map')
export class MapController {
  constructor(
    private readonly search: SearchService,
    private readonly photon: PhotonClient,
    private readonly osrm: OsrmRoutingProvider,
  ) {}

  @Get('categories')
  categories() {
    return Object.values(POI_CATEGORIES).map((c) => ({
      id: c.id,
      labelVi: c.labelVi,
      labelEn: c.labelEn,
    }));
  }

  @Get('search')
  @UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  async searchPlaces(@Query() query: MapSearchQueryDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.search.search(
      query.q,
      { lat: query.lat, lng: query.lng },
      { lat: query.biasLat, lng: query.biasLng },
      query.limit ?? 15,
    );
    if (result.degraded) res.setHeader('X-Search-Degraded', '1');
    return result.places;
  }

  @Get('nearby')
  @UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  nearby(@Query() query: MapNearbyQueryDto) {
    return this.search.nearby(query.lat, query.lng, query.category, query.radius ?? 1500, query.limit ?? 40);
  }

  @Get('reverse')
  @UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  async reverse(
    @Query() query: MapReverseQueryDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const snapped = await this.search.nearestWithin(query.lat, query.lng);
    if (snapped) return snapped;
    const lang = (acceptLanguage ?? 'vi').toLowerCase().startsWith('en') ? 'en' : 'vi';
    return this.photon.reverse(query.lat, query.lng, lang);
  }

  @Get('route')
  @UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  async route(@Query() query: MapRouteQueryDto) {
    const routes = await this.osrm.route(
      query.fromLat,
      query.fromLng,
      query.toLat,
      query.toLng,
      query.mode ?? 'car',
      query.alternatives !== false,
    );
    return { routes, mode: query.mode ?? 'car' };
  }
}
