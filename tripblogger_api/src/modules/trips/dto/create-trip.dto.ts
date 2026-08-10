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
import type { PlanTravelMode } from '../entities/trip.entity';

const PLAN_TRAVEL_MODES = ['motorbike', 'car', 'foot', 'bike'] as const;

export class CreateTripDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  destinationLabel!: string;

  @Type(() => Number)
  @IsNumber()
  destinationLat!: number;

  @Type(() => Number)
  @IsNumber()
  destinationLng!: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate!: string;

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
}
