import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import {
  MapNearbyQueryDto,
  MapReverseQueryDto,
  MapRouteQueryDto,
  MapSearchQueryDto,
} from './dto/map.dto';
import { MapService } from './map.service';

@Controller('map')
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('categories')
  categories() {
    return this.mapService.categories();
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  nearby(@Query() query: MapNearbyQueryDto) {
    return this.mapService.nearby(
      query.lat,
      query.lng,
      query.category,
      query.radius ?? 1500,
      query.limit ?? 40,
    );
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  search(@Query() query: MapSearchQueryDto) {
    return this.mapService.search(
      query.q,
      query.lat,
      query.lng,
      query.limit ?? 15,
      query.biasLat,
      query.biasLng,
    );
  }

  @Get('reverse')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  reverse(@Query() query: MapReverseQueryDto) {
    return this.mapService.reverse(query.lat, query.lng, query.fromLat, query.fromLng);
  }

  @Get('route')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER', 'GUEST')
  @RequiredStatuses('ACTIVE')
  route(@Query() query: MapRouteQueryDto) {
    return this.mapService.route(
      query.fromLat,
      query.fromLng,
      query.toLat,
      query.toLng,
      query.mode ?? 'car',
      query.alternatives !== false,
    );
  }
}
