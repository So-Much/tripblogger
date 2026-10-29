import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { ClaimStatusesGuard, RequiredStatuses, Roles, RolesGuard } from '../auth/claim-statuses.guard';
import { SearchService } from '../search/search.service';
import { PhotonClient } from '../geocode/photon.client';

class SearchQuery {
  @IsString()
  q!: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  limit?: number;
}

class NearbyQuery {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
  @IsOptional()
  @IsString()
  category?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

class ReverseQuery {
  @Type(() => Number)
  @IsNumber()
  lat!: number;
  @Type(() => Number)
  @IsNumber()
  lng!: number;
}

@Controller('places')
@UseGuards(JwksAuthGuard, RolesGuard, ClaimStatusesGuard)
@Roles('MEMBER', 'GUEST')
@RequiredStatuses('ACTIVE')
export class PlacesReadController {
  constructor(
    private readonly search: SearchService,
    private readonly photon: PhotonClient,
  ) {}

  @Get('search')
  async searchPlaces(@Query() query: SearchQuery) {
    const result = await this.search.search(query.q, { lat: query.lat, lng: query.lng }, undefined, query.limit ?? 15);
    return result.places;
  }

  @Get('nearby')
  nearby(@Query() query: NearbyQuery) {
    return this.search.nearby(query.lat, query.lng, query.category ?? 'restaurant', 1500, query.limit ?? 20);
  }

  @Get('reverse')
  async reverse(@Query() query: ReverseQuery) {
    const snapped = await this.search.nearestWithin(query.lat, query.lng);
    if (snapped) return snapped;
    return this.photon.reverse(query.lat, query.lng, 'vi');
  }

  @Get(':id')
  async getPlace(@Param('id') id: string) {
    // UUID validation soft — invalid ids simply miss
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) throw new NotFoundException();
    const detail = await this.search.getDetail(id);
    if (!detail) throw new NotFoundException();
    return detail;
  }
}
