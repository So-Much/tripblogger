import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsUUID()
  locationTypeId?: string;

  @IsOptional()
  @IsIn(['photon', 'nominatim'])
  externalSource?: 'photon' | 'nominatim';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalId?: string;
}

export class UpsertFromPlaceDto {
  @IsString()
  @MinLength(1)
  placeId!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @IsIn(['photon', 'nominatim'])
  source!: 'photon' | 'nominatim';

  @IsOptional()
  @IsUUID()
  locationTypeId?: string;
}
