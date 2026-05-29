export type ScoreInput = {
  distanceKm: number;
  avgRating: number;
  totalReview: number;
  popularityScore: number;
  categoryAlreadyInTrip: number;
  priceLevel: number | null;
  tripDailyBudget: number | null;
  lastReviewMonthsAgo: number | null;
};

export function distanceScore(km: number): number {
  if (km <= 0.5) return 1.0;
  if (km <= 1) return 0.9;
  if (km <= 2) return 0.75;
  if (km <= 3) return 0.6;
  if (km <= 5) return 0.4;
  if (km <= 10) return 0.2;
  return 0.05;
}

export function ratingScore(avgRating: number, totalReview: number): number {
  return (avgRating / 5) * Math.min(1, totalReview / 10);
}

export function categoryDiversityScore(alreadyCount: number): number {
  if (alreadyCount === 0) return 1.0;
  if (alreadyCount === 1) return 0.6;
  return 0.3;
}

export function priceMatchScore(priceLevel: number | null, tripDailyBudget: number | null): number {
  if (priceLevel == null || tripDailyBudget == null) return 0.5;
  const target = Math.min(4, Math.max(1, Math.round((tripDailyBudget * 0.3) / 200000)));
  return 1 - Math.min(1, Math.abs(priceLevel - target) / 4);
}

export function reviewRecencyScore(monthsAgo: number | null): number {
  if (monthsAgo == null) return 0.4;
  if (monthsAgo <= 6) return 1.0;
  if (monthsAgo <= 12) return 0.7;
  return 0.4;
}

export function computeRecommendationScore(input: ScoreInput): number {
  const w1 = 0.3;
  const w2 = 0.25;
  const w3 = 0.2;
  const w4 = 0.1;
  const w5 = 0.1;
  const w6 = 0.05;
  return (
    w1 * distanceScore(input.distanceKm) +
    w2 * ratingScore(input.avgRating, input.totalReview) +
    w3 * Math.min(1, input.popularityScore) +
    w4 * categoryDiversityScore(input.categoryAlreadyInTrip) +
    w5 * priceMatchScore(input.priceLevel, input.tripDailyBudget) +
    w6 * reviewRecencyScore(input.lastReviewMonthsAgo)
  );
}
