import { apiClient } from '@/src/services/api/client';

export type LocationReviewDto = {
  id: string;
  locationId: string;
  userId: string;
  rating: number;
  content: string | null;
  tags: string[];
  tripId: string | null;
  tripStopId: string | null;
  createdAt: string;
  updatedAt: string;
  author: { displayName: string; avatarUrl: string | null };
};

export type LocationReviewsPage = {
  items: LocationReviewDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type LocationReviewSummary = {
  total: number;
  avgRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  tags: { tag: string; count: number }[];
};

export const reviewsService = {
  async list(
    locationId: string,
    params: { sort?: 'recent' | 'rating'; page?: number; limit?: number },
  ): Promise<LocationReviewsPage> {
    const res = await apiClient.get<LocationReviewsPage>(`/locations/${locationId}/reviews`, {
      params: {
        sort: params.sort ?? 'recent',
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
    });
    return res.data;
  },

  async summary(locationId: string): Promise<LocationReviewSummary> {
    const res = await apiClient.get<LocationReviewSummary>(
      `/locations/${locationId}/reviews/summary`,
    );
    return res.data;
  },

  async mine(locationId: string): Promise<LocationReviewDto | null> {
    const res = await apiClient.get<LocationReviewDto | null>(
      `/locations/${locationId}/reviews/mine`,
    );
    return res.data;
  },

  async create(
    locationId: string,
    body: {
      rating: number;
      content?: string;
      tags?: string[];
      tripId?: string;
      tripStopId?: string;
    },
  ): Promise<LocationReviewDto> {
    const res = await apiClient.post<LocationReviewDto>(`/locations/${locationId}/reviews`, body);
    return res.data;
  },

  async update(
    locationId: string,
    reviewId: string,
    body: { rating?: number; content?: string; tags?: string[] },
  ): Promise<LocationReviewDto> {
    const res = await apiClient.patch<LocationReviewDto>(
      `/locations/${locationId}/reviews/${reviewId}`,
      body,
    );
    return res.data;
  },
};
