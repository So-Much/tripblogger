export const PRODUCT_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PENDING_VERIFICATION',
  'PUBLISHED',
  'RESERVED',
  'OUTOFSTOCK',
  'SOLD',
  'RETURNED',
  'REFUNDED',
  'BLOCKED',
  'REMOVED',
  'PREORDER',
  'NEEDSPHOTOS',
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_TYPES = ['NEW', 'SECONDHAND'] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const SELLER_VERIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type SellerVerificationStatus = (typeof SELLER_VERIFICATION_STATUSES)[number];

export const DEFAULT_STOCK_UNIT = 'cái';

export const DEFAULT_ANALYTICS_JSON = JSON.stringify({
  views: 0,
  saves: 0,
  shares: 0,
  avgRating: 0,
  totalRatings: 0,
  ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
});

export const CART_STATUSES = ['ACTIVE', 'CHECKING_OUT', 'INACTIVE', 'MERGED', 'ABANDONED'] as const;
export type CartStatus = (typeof CART_STATUSES)[number];

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PRODUCT_STATUSES = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURNED'] as const;
export type OrderProductStatus = (typeof ORDER_PRODUCT_STATUSES)[number];

export const PAYMENT_METHODS = ['COD', 'MOMO', 'VNPAY', 'BANKING', 'STRIPE'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const COUPON_TYPES = ['PERCENTAGE', 'FIXED'] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_APPLIES_TO = ['ALL', 'CATEGORY', 'PRODUCT'] as const;
export type CouponAppliesTo = (typeof COUPON_APPLIES_TO)[number];

export const COUPON_STATUSES = ['ACTIVE', 'EXPIRED', 'DISABLED'] as const;
export type CouponStatus = (typeof COUPON_STATUSES)[number];

export const SHIPPING_FEE = 30000;
export const FREE_SHIPPING_THRESHOLD = 500000;

export const SHIPMENT_CARRIERS = ['GHN', 'GHTK', 'VNPOST', 'OTHER'] as const;
export type ShipmentCarrier = (typeof SHIPMENT_CARRIERS)[number];

export const SHIPMENT_STATUSES = ['WAITING', 'PICKING', 'INTRANSIT', 'DELIVERED', 'FAILED'] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  WAITING: ['PICKING', 'INTRANSIT'],
  PICKING: ['INTRANSIT'],
  INTRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};
