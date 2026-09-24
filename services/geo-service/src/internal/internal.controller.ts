import {
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsArray, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SearchService } from '../search/search.service';
import { OsrmRoutingProvider, type TravelMode } from '../routing/osrm.routing.provider';

class PointDto {
  @Type(() => Number)
  lat!: number;
  @Type(() => Number)
  lng!: number;
}

class TableLegsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];
  @IsIn(['car', 'bike', 'foot'])
  mode!: TravelMode;
}

@Controller('internal')
export class InternalController {
  constructor(
    private readonly search: SearchService,
    private readonly osrm: OsrmRoutingProvider,
    private readonly config: ConfigService,
  ) {}

  @Get('places/:id')
  async getPlace(@Param('id') id: string, @Headers('x-internal-token') token?: string) {
    this.assertToken(token);
    const place = await this.search.getById(id);
    if (!place) throw new NotFoundException();
    return this.search.toDto(place);
  }

  @Post('routing/table-legs')
  async tableLegs(@Body() dto: TableLegsDto, @Headers('x-internal-token') token?: string) {
    this.assertToken(token);
    const legs = await this.osrm.tableLegs(dto.points, dto.mode);
    return { legs };
  }

  private assertToken(token?: string) {
    if (token !== this.config.get('GEO_INTERNAL_TOKEN')) throw new UnauthorizedException();
  }
}
