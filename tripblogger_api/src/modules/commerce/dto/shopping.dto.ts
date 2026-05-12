import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class CreateAddressDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsString()
  @MinLength(1)
  recipientName!: string;

  @IsString()
  @MinLength(1)
  phone!: string;

  @IsString()
  @MinLength(1)
  province!: string;

  @IsString()
  @MinLength(1)
  district!: string;

  @IsString()
  @MinLength(1)
  ward!: string;

  @IsString()
  @MinLength(1)
  street!: string;

  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  isDefault?: boolean;
}

export class ValidateCouponDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cartSubTotal!: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];
}

export class CheckoutDto {
  @IsUUID()
  addressId!: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class QueryOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  status?: string;

  /** Comma-separated order statuses (e.g. CONFIRMED,SHIPPING) for IN (...) filter */
  @IsOptional()
  @IsString()
  statusIn?: string;
}

export class CreateCouponDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  type!: 'PERCENTAGE' | 'FIXED';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsString()
  appliesTo!: 'ALL' | 'CATEGORY' | 'PRODUCT';

  @IsOptional()
  @IsString()
  appliesToIdsJson?: string | null;

  @IsString()
  activeAt!: string;

  @IsString()
  expiresAt!: string;
}

export class CreateShipmentDto {
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @IsString()
  carrier!: 'GHN' | 'GHTK' | 'VNPOST' | 'OTHER';

  @IsOptional()
  @IsString()
  estimatedDelivery?: string;
}

export class UpdateShipmentStatusDto {
  @IsString()
  status!: 'WAITING' | 'PICKING' | 'INTRANSIT' | 'DELIVERED' | 'FAILED';

  @IsOptional()
  @IsString()
  trackingCode?: string;
}

export class UpdateShipmentDto {
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @IsOptional()
  @IsString()
  carrier?: 'GHN' | 'GHTK' | 'VNPOST' | 'OTHER';

  @IsOptional()
  @IsString()
  estimatedDelivery?: string;
}

export class CreateRatingDto {
  @IsUUID()
  orderProductId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  review?: string;
}

export class QueryRatingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  sort?: 'newest' | 'highest' | 'lowest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score?: number;
}
