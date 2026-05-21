import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { PlacesService } from './places.service';
import { QueryPlacesNearbyDto, QueryPlacesReverseDto, QueryPlacesSearchDto } from './dto/query-places.dto';

@Controller('places')
@UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
@Roles('MEMBER')
@RequiredStatuses('ACTIVE')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  search(@Query() query: QueryPlacesSearchDto) {
    return this.placesService.search(query.q, query.lat, query.lng, query.limit ?? 10);
  }

  @Get('nearby')
  nearby(@Query() query: QueryPlacesNearbyDto) {
    return this.placesService.nearby(query.lat, query.lng, query.limit ?? 10);
  }

  @Get('reverse')
  reverse(@Query() query: QueryPlacesReverseDto) {
    return this.placesService.reverse(query.lat, query.lng);
  }
}
