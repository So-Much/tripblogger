import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StatusesGuard } from '../../common/guards/statuses.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequiredStatuses } from '../../common/decorators/statuses.decorator';
import { CreateLocationDto, UpsertFromPlaceDto } from './dto/create-location.dto';
import { QueryLocationsSearchDto } from './dto/query-locations.dto';
import { QueryLocationsNearbyDto } from './dto/query-locations-nearby.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

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
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, StatusesGuard)
  @Roles('MEMBER')
  @RequiredStatuses('ACTIVE')
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.findById(id);
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
