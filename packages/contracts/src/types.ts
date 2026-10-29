import type { RankSource } from './search-ranking';

export type MapPlaceDto = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  source: RankSource;
  distanceM: number | null;
  rating: number | null;
  reviewCount: number | null;
  openingHours: string | null;
  phone: string | null;
  website: string | null;
  imageUrl: string | null;
};

export type PlaceReviewDto = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
};

export type PlaceDetailDto = MapPlaceDto & {
  reviews: PlaceReviewDto[];
  isOpenNow: boolean | null;
};

export type CreatePlaceDto = {
  name: string;
  lat: number;
  lng: number;
  category?: string;
  address?: string;
  openingHours?: string;
  phone?: string;
  website?: string;
};

export type PlaceSuggestionDto = {
  name?: string;
  address?: string;
  openingHours?: string;
  phone?: string;
  website?: string;
  category?: string;
};

export type UserTravelBudgetDto = {
  amount: number | null;
  currency: string | null;
};
