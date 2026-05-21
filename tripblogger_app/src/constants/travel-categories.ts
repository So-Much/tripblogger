export const TRAVEL_CATEGORIES = ['Biển', 'Núi', 'Thành phố', 'Ẩm thực', 'Văn hóa', 'Khác'] as const;

export type TravelCategory = (typeof TRAVEL_CATEGORIES)[number];

export const TRAVEL_CATEGORY_OTHER: TravelCategory = 'Khác';
