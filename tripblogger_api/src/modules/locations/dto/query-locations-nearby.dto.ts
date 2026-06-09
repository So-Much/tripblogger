import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryLocationsNearbyDto {
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
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  typeCode?: string;

  /** Comma-separated location type codes, e.g. `restaurant,cafe,food` */
  @IsOptional()
  @IsString()
  @MaxLength(512)
  typeCodes?: string;

  @IsOptional()
  @IsIn(['rating', 'popularity'])
  sort?: 'rating' | 'popularity';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
