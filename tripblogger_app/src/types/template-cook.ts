import type { TripAccommodationDto, TripDto, TripLocationRef, TripStatus } from '@/src/types/trip';
import type { PostDto } from '@/src/types/post';

export type SlotType = 'POI' | 'FOOD' | 'STAY' | 'CUSTOM';
export type StayVibe = 'GLAMPING' | 'CENTRAL' | 'HOMESTAY';
export type EventBlockStatus = 'PLANNED' | 'DONE' | 'SKIPPED';
export type EventBlockSource = 'TEMPLATE' | 'PICK' | 'SWAP' | 'MANUAL';
export type TripEditMode = 'AUTO' | 'MANUAL';
export type AccommodationMode = 'VIBE' | 'CUSTOM';

export type DestinationDto = {
  id: string;
  code: string;
  name: string;
  centroidLat: number;
  centroidLng: number;
};

export type FeaturedLocationDto = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  slotType: SlotType | null;
  featuredRank: number | null;
  defaultDurationMin: number | null;
  vibeTags: string[];
};

export type TripTemplateSummaryDto = {
  id: string;
  title: string;
  nightCount: number;
  styleTags: string[];
  summary: string | null;
  destination: { id: string; code: string; name: string } | null;
};

export type TripTemplateDetailDto = TripTemplateSummaryDto & {
  blocks: {
    id: string;
    orderIndex: number;
    suggestedDayHint: number | null;
    location: FeaturedLocationDto | null;
  }[];
};

export type EventBlockDto = {
  id: string;
  tripId: string;
  tripDayId: string | null;
  orderIndex: number;
  location: TripLocationRef | null;
  locationId: string | null;
  customName: string | null;
  customAddress: string | null;
  customLat: number | null;
  customLng: number | null;
  slotType: SlotType;
  status: EventBlockStatus;
  source: EventBlockSource;
  plannedDurationMin: number | null;
};

export type CookTripDayDto = {
  id: string;
  date: string;
  dayNumber: number;
  title: string | null;
  eventBlocks: EventBlockDto[];
};

export type CookAccommodationDto = TripAccommodationDto & {
  mode?: AccommodationMode | null;
  vibe?: StayVibe | null;
  isPlaceholder?: boolean;
  customLatitude?: number | null;
  customLongitude?: number | null;
};

export type EnrichedTripDto = Omit<TripDto, 'days' | 'accommodations'> & {
  destinationId?: string | null;
  destination?: DestinationDto | null;
  templateId?: string | null;
  nightCount?: number | null;
  editMode?: TripEditMode;
  pickLocationIds?: string[];
  picks?: TripLocationRef[];
  eventBlocks?: EventBlockDto[];
  unscheduled?: EventBlockDto[];
  checkInCount?: number;
  accommodations?: CookAccommodationDto[];
  days?: CookTripDayDto[];
  status: TripStatus;
};

export type TripCheckInDto = {
  id: string;
  tripId: string;
  eventBlockId: string | null;
  checkedInAt: string;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  media: {
    mediaId: string;
    orderIndex: number;
    url: string;
    thumbnailUrl: string | null;
  }[];
};

export type AssembleDraftResult = {
  postId: string;
  alreadyPublished: boolean;
  post: PostDto;
};

export type SwapCandidateDto = FeaturedLocationDto & {
  distanceKm?: number;
};
