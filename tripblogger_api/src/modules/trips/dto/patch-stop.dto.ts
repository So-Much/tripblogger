import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import type { PlanTravelMode } from '../entities/trip.entity';
import type { StopPriority, StopStatus } from '../entities/trip-stop.entity';

const PLAN_TRAVEL_MODES = ['motorbike', 'car', 'foot', 'bike'] as const;
const STOP_PRIORITIES = ['must', 'nice'] as const;
const STOP_STATUSES = ['todo', 'doing', 'done', 'skipped'] as const;

export class PatchStopDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferAfterMinutes?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(PLAN_TRAVEL_MODES)
  travelModeOverride?: PlanTravelMode | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  anchorTime?: string | null;

  @IsOptional()
  @IsIn(STOP_PRIORITIES)
  priority?: StopPriority;

  @IsOptional()
  @IsIn(STOP_STATUSES)
  status?: StopStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
