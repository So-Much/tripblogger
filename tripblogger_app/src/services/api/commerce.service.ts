import { apiBaseUrl, apiClient } from '@/src/services/api/client';
import type {
  AddressDto,
  CartDto,
  CategoryDto,
  CouponDto,
  OrderDto,
  PaginatedOrders,
  PaginatedProducts,
  PaginatedRatings,
  PaymentDto,
  ProductDto,
  RatingSummaryDto,
  ShipmentDto,
  TagDto,
} from '@/src/types/commerce';

function apiOrigin(): string {
  try {
    const parsed = new URL(apiBaseUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }
}

function toAbsolute(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  const base = apiOrigin().replace(/\/+$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function normalizeProduct(p: ProductDto): ProductDto {
  return {
    ...p,
    media: (p.media ?? []).map((item) => ({
      ...item,
      url: toAbsolute(item.url) ?? item.url,
      thumbnailUrl: toAbsolute(item.thumbnailUrl),
      previewUrl: toAbsolute(item.previewUrl),
      originalUrl: toAbsolute(item.originalUrl),
    })),
    seller: {
      ...p.seller,
      avatarUrl: toAbsolute(p.seller.avatarUrl ?? undefined) ?? p.seller.avatarUrl,
    },
  };
}

export const commerceService = {
  async listCategories(): Promise<CategoryDto[]> {
    const res = await apiClient.get<CategoryDto[]>('/commerce/categories');
    return res.data;
  },

  async listPublicProducts(params: {
    limit?: number;
    cursor?: string;
    categoryId?: string;
    search?: string;
    productType?: 'NEW' | 'SECONDHAND';
    sortBy?: string;
  }): Promise<PaginatedProducts> {
    const res = await apiClient.get<PaginatedProducts>('/commerce/products', {
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.search ? { search: params.search } : {}),
        ...(params.productType ? { productType: params.productType } : {}),
        ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      },
    });
    return { ...res.data, items: res.data.items.map(normalizeProduct) };
  },

  async listMyProducts(params: {
    limit?: number;
    cursor?: string;
    status?: string;
  }): Promise<PaginatedProducts> {
    const res = await apiClient.get<PaginatedProducts>('/commerce/products/mine', {
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    });
    return { ...res.data, items: res.data.items.map(normalizeProduct) };
  },

  async getProduct(id: string): Promise<ProductDto> {
    const res = await apiClient.get<ProductDto>(`/commerce/products/${id}`);
    return normalizeProduct(res.data);
  },

  async createProduct(body: {
    title: string;
    categoryId: string;
    description: string;
    price: number;
    productType: 'NEW' | 'SECONDHAND';
    stock: number;
    stockUnit?: string;
    media?: { type: 'image' | 'video'; url: string; thumbnailUrl?: string; previewUrl?: string; originalUrl?: string }[];
    tags?: string[];
  }): Promise<ProductDto> {
    const res = await apiClient.post<ProductDto>('/commerce/products', body);
    return normalizeProduct(res.data);
  },

  async updateProduct(
    id: string,
    body: Partial<{
      title: string;
      categoryId: string;
      description: string;
      price: number;
      productType: 'NEW' | 'SECONDHAND';
      stock: number;
      stockUnit: string;
      media: { type: 'image' | 'video'; url: string; thumbnailUrl?: string; previewUrl?: string; originalUrl?: string }[];
      tags: string[];
    }>,
  ): Promise<ProductDto> {
    const res = await apiClient.patch<ProductDto>(`/commerce/products/${id}`, body);
    return normalizeProduct(res.data);
  },

  async publishProduct(id: string): Promise<ProductDto> {
    const res = await apiClient.post<ProductDto>(`/commerce/products/${id}/publish`);
    return normalizeProduct(res.data);
  },

  async deleteProduct(id: string): Promise<{ ok: true }> {
    const res = await apiClient.delete<{ ok: true }>(`/commerce/products/${id}`);
    return res.data;
  },

  async uploadMedia(file: { uri: string; name: string; type: string }, kind: 'image' | 'video') {
    const body = new FormData();
    body.append('kind', kind);
    body.append('file', file as unknown as Blob);
    const res = await apiClient.post<{
      kind: 'image' | 'video';
      url: string;
      thumbnailUrl?: string;
      previewUrl?: string;
      originalUrl?: string;
      mimeType: string;
      size: number;
      width?: number;
      height?: number;
      placeholder?: string;
      storage?: 'local' | 'cloud';
      sourcePath?: string;
    }>('/commerce/products/media', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return {
      ...res.data,
      url: toAbsolute(res.data.url) ?? res.data.url,
      thumbnailUrl: toAbsolute(res.data.thumbnailUrl),
      previewUrl: toAbsolute(res.data.previewUrl),
      originalUrl: toAbsolute(res.data.originalUrl),
    };
  },

  async searchTags(search?: string): Promise<TagDto[]> {
    const res = await apiClient.get<TagDto[]>('/commerce/tags', { params: search ? { search } : {} });
    return res.data;
  },

  async requestSellerVerification() {
    const res = await apiClient.post('/commerce/seller/verify');
    return res.data;
  },

  async getVerificationStatus(): Promise<{ status: 'PENDING' | 'APPROVED' | 'REJECTED'; requestedAt?: string } | null> {
    const res = await apiClient.get<{ status: 'PENDING' | 'APPROVED' | 'REJECTED'; requestedAt?: string } | null>(
      '/commerce/seller/verification-status',
    );
    return res.data;
  },

  async toggleWishlist(productId: string): Promise<{ wishlisted: boolean }> {
    const res = await apiClient.post<{ wishlisted: boolean }>(`/commerce/wishlist/${productId}`);
    return res.data;
  },

  async listWishlist(params: { limit?: number; cursor?: string }): Promise<PaginatedProducts> {
    const res = await apiClient.get<PaginatedProducts>('/commerce/wishlist', {
      params: { limit: params.limit ?? 20, ...(params.cursor ? { cursor: params.cursor } : {}) },
    });
    return { ...res.data, items: res.data.items.map(normalizeProduct) };
  },

  async getCart(): Promise<CartDto> {
    const res = await apiClient.get<CartDto>('/commerce/cart');
    const d = res.data;
    return {
      ...d,
      items: d.items.map((i) => ({ ...i, product: normalizeProduct(i.product) })),
    };
  },

  async addToCart(body: { productId: string; quantity?: number }): Promise<CartDto> {
    const res = await apiClient.post<CartDto>('/commerce/cart/items', body);
    const d = res.data;
    return {
      ...d,
      items: d.items.map((i) => ({ ...i, product: normalizeProduct(i.product) })),
    };
  },

  async updateCartItem(itemId: string, body: { quantity: number }): Promise<CartDto> {
    const res = await apiClient.patch<CartDto>(`/commerce/cart/items/${itemId}`, body);
    const d = res.data;
    return {
      ...d,
      items: d.items.map((i) => ({ ...i, product: normalizeProduct(i.product) })),
    };
  },

  async removeCartItem(itemId: string): Promise<CartDto> {
    const res = await apiClient.delete<CartDto>(`/commerce/cart/items/${itemId}`);
    const d = res.data;
    return {
      ...d,
      items: d.items.map((i) => ({ ...i, product: normalizeProduct(i.product) })),
    };
  },

  async listAddresses(): Promise<AddressDto[]> {
    const res = await apiClient.get<AddressDto[]>('/commerce/addresses');
    return res.data;
  },

  async createAddress(body: {
    label: string;
    recipientName: string;
    phone: string;
    province: string;
    district: string;
    ward: string;
    street: string;
    isDefault?: boolean;
  }): Promise<AddressDto> {
    const res = await apiClient.post<AddressDto>('/commerce/addresses', body);
    return res.data;
  },

  async updateAddress(
    id: string,
    body: Partial<{
      label: string;
      recipientName: string;
      phone: string;
      province: string;
      district: string;
      ward: string;
      street: string;
      isDefault: boolean;
    }>,
  ): Promise<AddressDto> {
    const res = await apiClient.patch<AddressDto>(`/commerce/addresses/${id}`, body);
    return res.data;
  },

  async deleteAddress(id: string): Promise<{ ok: true }> {
    const res = await apiClient.delete<{ ok: true }>(`/commerce/addresses/${id}`);
    return res.data;
  },

  async setDefaultAddress(id: string): Promise<AddressDto> {
    const res = await apiClient.post<AddressDto>(`/commerce/addresses/${id}/default`);
    return res.data;
  },

  async validateCoupon(body: { code: string; cartSubTotal: number; categoryIds?: string[]; productIds?: string[] }) {
    const res = await apiClient.post<{
      valid: boolean;
      coupon?: CouponDto;
      discountAmount?: number;
      reason?: string;
    }>('/commerce/coupons/validate', body);
    return res.data;
  },

  async listAvailableCoupons(cartSubTotal?: number): Promise<CouponDto[]> {
    const res = await apiClient.get<CouponDto[]>('/commerce/coupons/available', {
      params: cartSubTotal != null ? { cartSubTotal } : {},
    });
    return res.data;
  },

  async checkout(body: {
    addressId?: string;
    couponCode?: string;
    note?: string;
    guestInfo?: {
      recipientName: string;
      phone: string;
      email: string;
      province: string;
      district: string;
      ward: string;
      street: string;
    };
  }): Promise<OrderDto> {
    const res = await apiClient.post<OrderDto>('/commerce/orders/checkout', body);
    return res.data;
  },

  async listOrders(params: {
    limit?: number;
    cursor?: string;
    status?: string;
    /** Comma-separated statuses, e.g. CONFIRMED,SHIPPING */
    statusIn?: string;
  }): Promise<PaginatedOrders> {
    const res = await apiClient.get<PaginatedOrders>('/commerce/orders', {
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.statusIn ? { statusIn: params.statusIn } : {}),
      },
    });
    return res.data;
  },

  async listSellerOrders(params: {
    limit?: number;
    cursor?: string;
    status?: string;
    statusIn?: string;
  }): Promise<PaginatedOrders> {
    const res = await apiClient.get<PaginatedOrders>('/commerce/orders/seller', {
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.statusIn ? { statusIn: params.statusIn } : {}),
      },
    });
    return res.data;
  },

  async getOrder(id: string): Promise<OrderDto> {
    const res = await apiClient.get<OrderDto>(`/commerce/orders/${id}`);
    return {
      ...res.data,
      items: (res.data.items ?? []).map((line) => ({
        ...line,
        product: line.product
          ? {
              ...line.product,
              media: (line.product.media ?? []).map((m) => ({
                ...m,
                url: toAbsolute(m.url) ?? m.url,
                thumbnailUrl: toAbsolute(m.thumbnailUrl),
                previewUrl: toAbsolute(m.previewUrl),
                originalUrl: toAbsolute(m.originalUrl),
              })),
            }
          : line.product,
      })),
    };
  },

  async getOrderPayment(orderId: string): Promise<PaymentDto> {
    const res = await apiClient.get<PaymentDto>(`/commerce/orders/${orderId}/payment`);
    return res.data;
  },

  async cancelOrder(id: string): Promise<OrderDto> {
    const res = await apiClient.post<OrderDto>(`/commerce/orders/${id}/cancel`);
    return res.data;
  },

  async confirmOrder(id: string): Promise<OrderDto> {
    const res = await apiClient.post<OrderDto>(`/commerce/orders/${id}/confirm`);
    return res.data;
  },

  async confirmOrderReceived(id: string): Promise<OrderDto> {
    const res = await apiClient.post<OrderDto>(`/commerce/orders/${id}/received`);
    return res.data;
  },

  async createShipment(
    orderId: string,
    body: { carrier: 'GHN' | 'GHTK' | 'VNPOST' | 'OTHER'; trackingCode?: string; estimatedDelivery?: string },
  ): Promise<ShipmentDto> {
    const res = await apiClient.post<ShipmentDto>(`/commerce/orders/${orderId}/shipment`, body);
    return res.data;
  },

  async listShipments(orderId: string): Promise<ShipmentDto[]> {
    const res = await apiClient.get<ShipmentDto[]>(`/commerce/orders/${orderId}/shipment`);
    return res.data;
  },

  async updateShipmentStatus(shipmentId: string, body: { status: string; trackingCode?: string }) {
    const res = await apiClient.patch<ShipmentDto>(`/commerce/shipments/${shipmentId}/status`, body);
    return res.data;
  },

  async updateShipment(shipmentId: string, body: { trackingCode?: string; carrier?: string; estimatedDelivery?: string }) {
    const res = await apiClient.patch<ShipmentDto>(`/commerce/shipments/${shipmentId}`, body);
    return res.data;
  },

  async createProductRating(productId: string, body: { orderProductId: string; score: number; review?: string }) {
    const res = await apiClient.post(`/commerce/products/${productId}/ratings`, body);
    return res.data;
  },

  async listProductRatings(
    productId: string,
    params: { limit?: number; cursor?: string; sort?: string; score?: number },
  ): Promise<PaginatedRatings> {
    const res = await apiClient.get<PaginatedRatings>(`/commerce/products/${productId}/ratings`, {
      params: {
        limit: params.limit ?? 20,
        ...(params.cursor ? { cursor: params.cursor } : {}),
        ...(params.sort ? { sort: params.sort } : {}),
        ...(params.score != null ? { score: params.score } : {}),
      },
    });
    return {
      ...res.data,
      items: res.data.items.map((i) => ({
        ...i,
        avatarUrl: toAbsolute(i.avatarUrl ?? undefined) ?? i.avatarUrl,
      })),
    };
  },

  async getRatingSummary(productId: string): Promise<RatingSummaryDto> {
    const res = await apiClient.get<RatingSummaryDto>(`/commerce/products/${productId}/ratings/summary`);
    return res.data;
  },
};
