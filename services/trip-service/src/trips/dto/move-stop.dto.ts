import { Type } from 'class-transformer';
import { IsInt, IsUUID, Min, ValidateIf } from 'class-validator';

export class MoveStopDto {
  /** Target day id, or null for the idea bucket. */
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  toTripDayId!: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  toPosition!: number;
}
