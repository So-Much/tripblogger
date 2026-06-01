import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class QueryDrivingRouteDto {
  @Type(() => Number)
  @IsNumber()
  fromLat!: number;

  @Type(() => Number)
  @IsNumber()
  fromLng!: number;

  @Type(() => Number)
  @IsNumber()
  toLat!: number;

  @Type(() => Number)
  @IsNumber()
  toLng!: number;
}
