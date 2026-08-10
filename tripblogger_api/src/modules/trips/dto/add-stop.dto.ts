import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { PlanTravelMode } from '../entities/trip.entity';
import type { StopPriority } from '../entities/trip-stop.entity';

const PLAN_TRAVEL_MODES = ['motorbike', 'car', 'foot', 'bike'] as const;
const STOP_PRIORITIES = ['must', 'nice'] as const;

export class AddStopPlaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  address!: string | null;

  @Type(() => Number)
  @IsNumber()
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  lng!: number;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category!: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  openingHours?: string | null;

  @IsString()
  @MinLength(1)
  source!: string;
}

export class AddStopDto {
  @ValidateNested()
  @Type(() => AddStopPlaceDto)
  place!: AddStopPlaceDto;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsUUID()
  tripDayId!: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsIn(STOP_PRIORITIES)
  priority?: StopPriority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  anchorTime?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(PLAN_TRAVEL_MODES)
  travelModeOverride?: PlanTravelMode | null;
}
