import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PRODUCT_TYPES, ProductType } from '../constants';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title!: string;

  @IsString()
  categoryId!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price!: number;

  @IsIn([...PRODUCT_TYPES])
  productType!: ProductType;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  stock!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stockUnit?: string;

  @IsOptional()
  @IsArray()
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    previewUrl?: string;
    originalUrl?: string;
  }>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
