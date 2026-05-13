/** Mock deals on home feed (widgets). */
export interface CommerceDeal {
  id: string;
  title: string;
  shopName: string;
  priceLabel: string;
  soldLabel: string;
  badge: string;
  /** Optional cover image for marketplace-style cards */
  imageUrl?: string;
}

export type ProductStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PENDING_VERIFICATION'
  | 'PUBLISHED'
  | 'RESERVED'
  | 'OUTOFSTOCK'
  | 'SOLD'
  | 'RETURNED'
  | 'REFUNDED'
  | 'BLOCKED'
  | 'REMOVED'
  | 'PREORDER'
  | 'NEEDSPHOTOS';

export type ProductType = 'NEW' | 'SECONDHAND';

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
}

export interface SellerInfo {
  id: string;
  displayName: string;
  username: string;
  isVerifiedSeller: boolean;
  avatarUrl?: string | null;
}

export interface CategoryDto {
  id: string;
  name: string;
}

export interface TagDto {
  id: string;
  name: string;
}

export interface ProductDto {
  id: string;
  sellerId: string;
  seller: SellerInfo;
  categoryId: string;
  category: CategoryDto;
  title: string;
  slug: string;
  tags: string[];
  media: MediaItem[];
  description: string;
  price: number;
  productType: ProductType;
  stock: number;
  stockUnit: string;
  status: ProductStatus;
  analytics: {
    views: number;
    saves: number;
    shares: number;
    avgRating: number;
    totalRatings: number;
  };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface PaginatedProducts {
  items: ProductDto[];
  nextCursor: string | null;
  total: number;
}

export type CartStatus = 'ACTIVE' | 'INACTIVE' | 'MERGED' | 'ABANDONED';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export type OrderProductStatus = 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'RETURNED';

export type PaymentMethod = 'COD' | 'MOMO' | 'VNPAY' | 'BANKING' | 'STRIPE';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface CartItemDto {
  id: string;
  productId: string;
  quantity: number;
  priceSnapshot: number;
  product: ProductDto;
}

export interface CartDto {
  id: string;
  status: CartStatus;
  items: CartItemDto[];
  itemCount: number;
  subTotal: number;
}

export interface AddressDto {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CouponDto {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderValue: number | null;
  maxDiscountAmount: number | null;
  appliesTo: 'ALL' | 'CATEGORY' | 'PRODUCT';
  status: string;
  expiresAt: string;
}

export interface OrderProductDto {
  id: string;
  productId: string;
  sellerId: string;
  quantity: number;
  priceSnapshot: number;
  productTitleSnapshot: string;
  status: OrderProductStatus;
  product?: ProductDto;
  /** Present for buyer when listing order detail */
  rated?: boolean;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  paidAt: string | null;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  orderCode: string;
  buyerId: string;
  addressId: string | null;
  couponId: string | null;
  status: OrderStatus;
  subTotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  address?: AddressDto;
  guestAddress?: {
    recipientName: string | null;
    phone: string | null;
    email: string | null;
    province: string | null;
    district: string | null;
    ward: string | null;
    street: string | null;
  } | null;
  items?: OrderProductDto[];
  payment?: PaymentDto;
}

export interface PaginatedOrders {
  items: OrderDto[];
  nextCursor: string | null;
  total: number;
}

export type ShipmentStatus = 'WAITING' | 'PICKING' | 'INTRANSIT' | 'DELIVERED' | 'FAILED';

export type ShipmentCarrier = 'GHN' | 'GHTK' | 'VNPOST' | 'OTHER';

export interface ShipmentDto {
  id: string;
  orderId: string;
  sellerId: string;
  trackingCode: string | null;
  carrier: ShipmentCarrier;
  status: ShipmentStatus;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRatingDto {
  id: string;
  productId: string;
  userId: string;
  orderProductId: string;
  score: number;
  review: string | null;
  createdAt: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface PaginatedRatings {
  items: ProductRatingDto[];
  nextCursor: string | null;
  total: number;
}

export interface RatingSummaryDto {
  avgRating: number;
  totalRatings: number;
  distribution: Record<string, number>;
}
