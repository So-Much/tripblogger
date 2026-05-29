import {
  IsArray,
  IsBoolean,
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
import { Type } from 'class-transformer';
import { TripStatus } from '../entities/trip.entity';
import { TransportMode, TripStopStatus } from '../entities/trip-stop.entity';
import { TripMemberRole, TripMemberStatus } from '../entities/trip-member.entity';

export class CreateTripDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  destinationName?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalBudget?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  destinationName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  totalBudget?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChangeTripDatesDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsIn(['delete_orphan_stops', 'move_to_previous_day', 'cancel'])
  shrinkPolicy?: 'delete_orphan_stops' | 'move_to_previous_day' | 'cancel';
}

export class UpdateTripStatusDto {
  @IsIn(['DRAFT', 'PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED'])
  status!: TripStatus;
}

export class QueryTripsDto {
  @IsOptional()
  @IsIn(['DRAFT', 'PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED'])
  status?: TripStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class InviteMemberDto {
  @IsUUID()
  userId!: string;

  @IsIn(['EDITOR', 'VIEWER'])
  role!: TripMemberRole;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsIn(['EDITOR', 'VIEWER'])
  role?: TripMemberRole;

  @IsOptional()
  @IsIn(['ACCEPTED', 'DECLINED'])
  status?: TripMemberStatus;
}

export class TransferOwnerDto {
  @IsUUID()
  newOwnerUserId!: string;
}

export class CreateAccommodationDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  customName?: string;

  @IsOptional()
  @IsString()
  customAddress?: string;

  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  lng?: number;

  @IsDateString()
  checkIn!: string;

  @IsDateString()
  checkOut!: string;

  @IsOptional()
  @IsString()
  roomType?: string;

  @IsOptional()
  @Type(() => Number)
  pricePerNight?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateStopDto {
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  customName?: string;

  @IsOptional()
  @IsString()
  customAddress?: string;

  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  orderIndex?: number;

  @IsOptional()
  @IsString()
  arrivalTime?: string;

  @IsOptional()
  @Type(() => Number)
  durationMinutes?: number;

  @IsOptional()
  @IsIn(['WALK', 'MOTORBIKE', 'CAR', 'TAXI', 'BUS', 'BOAT', 'TRAIN', 'PLANE'])
  transportMode?: TransportMode;

  @IsOptional()
  @Type(() => Number)
  budgetEstimate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateStopDto {
  @IsOptional()
  @IsIn(['PLANNED', 'VISITING', 'VISITED', 'SKIPPED'])
  status?: TripStopStatus;

  @IsOptional()
  @Type(() => Number)
  actualSpent?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  arrivalTime?: string;

  @IsOptional()
  @Type(() => Number)
  durationMinutes?: number;
}

export class ReorderStopsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderStopItemDto)
  stops!: ReorderStopItemDto[];
}

class ReorderStopItemDto {
  @IsUUID()
  id!: string;

  @Type(() => Number)
  @IsInt()
  orderIndex!: number;
}

export class UpdateTripDayDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class LinkTripPostDto {
  @IsUUID()
  postId!: string;
}

export class SaveLocationDto {
  @IsUUID()
  locationId!: string;

  @IsOptional()
  @IsString()
  collectionName?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
