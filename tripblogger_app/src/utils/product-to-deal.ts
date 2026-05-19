import type { CommerceDeal, ProductDto } from '@/src/types/commerce';

export function productToCommerceDeal(product: ProductDto): CommerceDeal {
  const cover = product.media?.[0]?.thumbnailUrl ?? product.media?.[0]?.url;
  const priceLabel = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price);
  const shopName = product.seller.displayName || product.seller.username;
  const soldLabel =
    product.analytics.totalRatings > 0
      ? `${product.analytics.totalRatings} đánh giá`
      : `${product.analytics.views} lượt xem`;

  return {
    id: product.id,
    title: product.title,
    shopName,
    priceLabel,
    soldLabel,
    badge: product.productType === 'SECONDHAND' ? '2nd hand' : 'Mới',
    imageUrl: cover,
  };
}
