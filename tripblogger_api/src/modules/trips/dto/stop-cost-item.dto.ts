import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export type StopCostItemDto = {
  id: string;
  label: string;
  unitAmount: number;
  quantity: number;
};

export class StopCostItemInput {
  @IsString()
  @MaxLength(64)
  id!: string;

  @IsString()
  @MaxLength(120)
  label!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitAmount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PatchStopCostItemsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StopCostItemInput)
  costItems?: StopCostItemInput[];
}
