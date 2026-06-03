export const locationKeys = {
  all: ['location'] as const,
  detail: (id: string) => [...locationKeys.all, 'detail', id] as const,
  media: (id: string) => [...locationKeys.all, 'media', id] as const,
  reviews: (id: string, sort: string) => [...locationKeys.all, 'reviews', id, sort] as const,
  reviewSummary: (id: string) => [...locationKeys.all, 'review-summary', id] as const,
  myReview: (id: string) => [...locationKeys.all, 'my-review', id] as const,
  myMemories: (id: string) => [...locationKeys.all, 'my-memories', id] as const,
  myCheckins: (id: string) => [...locationKeys.all, 'my-checkins', id] as const,
  nearby: (lat: number, lng: number, radius: number) =>
    [...locationKeys.all, 'nearby', lat, lng, radius] as const,
  saved: () => [...locationKeys.all, 'saved'] as const,
};
