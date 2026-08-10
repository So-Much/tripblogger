import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { PlanTravelMode, TripStatus } from '../entities/trip.entity';

const PLAN_TRAVEL_MODES = ['motorbike', 'car', 'foot', 'bike'] as const;
const TRIP_STATUSES = ['draft', 'active', 'completed', 'archived'] as const;

export class PatchTripDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  destinationLabel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  destinationLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  destinationLng?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @IsOptional()
  @IsIn(PLAN_TRAVEL_MODES)
  defaultTravelMode?: PlanTravelMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultBufferMinutes?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  defaultDayStartTime?: string;

  @IsOptional()
  @IsIn(TRIP_STATUSES)
  status?: TripStatus;
}
