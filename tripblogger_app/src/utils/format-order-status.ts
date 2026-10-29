import type { AppLanguage } from '@/src/store/settings.store';
import type { OrderStatus, PaymentMethod, PaymentStatus, ShipmentStatus } from '@/src/types/commerce';

const ORDER_STATUS_VI: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

const ORDER_STATUS_EN: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SHIPPING: 'Shipping',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const PAYMENT_METHOD_VI: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng',
  MOMO: 'MoMo',
  VNPAY: 'VNPay',
  BANKING: 'Chuyển khoản',
  STRIPE: 'Stripe',
};

const PAYMENT_METHOD_EN: Record<PaymentMethod, string> = {
  COD: 'Cash on delivery',
  MOMO: 'MoMo',
  VNPAY: 'VNPay',
  BANKING: 'Bank transfer',
  STRIPE: 'Stripe',
};

const PAYMENT_STATUS_VI: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

const PAYMENT_STATUS_EN: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const SHIPMENT_STATUS_VI: Record<ShipmentStatus, string> = {
  WAITING: 'Chờ lấy hàng',
  PICKING: 'Đang lấy hàng',
  INTRANSIT: 'Đang vận chuyển',
  DELIVERED: 'Đã giao',
  FAILED: 'Giao thất bại',
};

const SHIPMENT_STATUS_EN: Record<ShipmentStatus, string> = {
  WAITING: 'Waiting',
  PICKING: 'Picking up',
  INTRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
};

export function formatOrderStatus(status: string, language: AppLanguage = 'vi'): string {
  const map = language === 'en' ? ORDER_STATUS_EN : ORDER_STATUS_VI;
  return map[status as OrderStatus] ?? status;
}

export function formatPaymentMethod(method: string, language: AppLanguage = 'vi'): string {
  const map = language === 'en' ? PAYMENT_METHOD_EN : PAYMENT_METHOD_VI;
  return map[method as PaymentMethod] ?? method;
}

export function formatPaymentStatus(status: string, language: AppLanguage = 'vi'): string {
  const map = language === 'en' ? PAYMENT_STATUS_EN : PAYMENT_STATUS_VI;
  return map[status as PaymentStatus] ?? status;
}

export function formatShipmentStatus(status: string, language: AppLanguage = 'vi'): string {
  const map = language === 'en' ? SHIPMENT_STATUS_EN : SHIPMENT_STATUS_VI;
  return map[status as ShipmentStatus] ?? status;
}
