import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateFrameTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  destinationCode?: string;

  @IsDateString()
  startDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  nightCount!: number;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsIn(['GLAMPING', 'CENTRAL', 'HOMESTAY'])
  vibe?: 'GLAMPING' | 'CENTRAL' | 'HOMESTAY';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;
}

export class SetPicksDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  locationIds!: string[];
}

export class SetAccommodationDto {
  @IsIn(['VIBE', 'CUSTOM'])
  mode!: 'VIBE' | 'CUSTOM';

  @IsOptional()
  @IsIn(['GLAMPING', 'CENTRAL', 'HOMESTAY'])
  vibe?: 'GLAMPING' | 'CENTRAL' | 'HOMESTAY';

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customName?: string;

  @IsOptional()
  @IsString()
  customAddress?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customLng?: number;
}

export class ReorderBlocksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderBlockItemDto)
  items!: ReorderBlockItemDto[];
}

export class ReorderBlockItemDto {
  @IsUUID()
  blockId!: string;

  @IsOptional()
  @IsUUID()
  tripDayId?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex!: number;
}

export class CreateEventBlockDto {
  @IsOptional()
  @IsUUID()
  tripDayId?: string | null;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customName?: string;

  @IsOptional()
  @IsString()
  customAddress?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customLng?: number;

  @IsOptional()
  @IsIn(['POI', 'FOOD', 'STAY', 'CUSTOM'])
  slotType?: 'POI' | 'FOOD' | 'STAY' | 'CUSTOM';
}

export class PatchEventBlockDto {
  @IsOptional()
  @IsIn(['PLANNED', 'SKIPPED'])
  status?: 'PLANNED' | 'SKIPPED';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customName?: string;
}

export class SwapBlockDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customName?: string;

  @IsOptional()
  @IsString()
  customAddress?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customLng?: number;
}

export class CreateTripCheckInDto {
  @IsOptional()
  @IsUUID()
  eventBlockId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  checkedInAt?: string;
}

export class AttachCheckInMediaDto {
  @IsUUID()
  mediaId!: string;
}
