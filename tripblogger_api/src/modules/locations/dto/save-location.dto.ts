import { IsOptional, IsString, IsUUID } from 'class-validator';

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
