import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateCheckinDto {
  @IsUUID()
  locationId!: string;

  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsIn(['PUBLIC', 'FRIENDS', 'PRIVATE'])
  privacyLevel?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
}
