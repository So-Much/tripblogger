import { apiClient } from '@/src/services/api/client';
import type {
  AssembleDraftResult,
  CookAccommodationDto,
  DestinationDto,
  EnrichedTripDto,
  EventBlockDto,
  FeaturedLocationDto,
  StayVibe,
  TripCheckInDto,
  TripTemplateDetailDto,
  TripTemplateSummaryDto,
} from '@/src/types/template-cook';

export const templateCookService = {
  async listDestinations(): Promise<DestinationDto[]> {
    const res = await apiClient.get<DestinationDto[]>('/destinations');
    return res.data;
  },

  async featuredLocations(
    code: string,
    slotType?: 'POI' | 'FOOD' | 'STAY',
  ): Promise<{ destination: DestinationDto | null; items: FeaturedLocationDto[] }> {
    const res = await apiClient.get<{ destination: DestinationDto | null; items: FeaturedLocationDto[] }>(
      `/destinations/${encodeURIComponent(code)}/featured-locations`,
      { params: slotType ? { slotType } : undefined },
    );
    return res.data;
  },

  async listTemplates(destinationCode?: string): Promise<TripTemplateSummaryDto[]> {
    const res = await apiClient.get<TripTemplateSummaryDto[]>('/templates', {
      params: destinationCode ? { destinationCode } : undefined,
    });
    return res.data;
  },

  async getTemplate(id: string): Promise<TripTemplateDetailDto> {
    const res = await apiClient.get<TripTemplateDetailDto>(`/templates/${id}`);
    return res.data;
  },

  async createFrame(body: {
    destinationCode?: string;
    startDate: string;
    nightCount: number;
    templateId?: string;
    vibe?: StayVibe;
    title?: string;
  }): Promise<EnrichedTripDto> {
    const res = await apiClient.post<EnrichedTripDto>('/trips/frame', body);
    return res.data;
  },

  async setPicks(tripId: string, locationIds: string[]): Promise<EnrichedTripDto> {
    const res = await apiClient.put<EnrichedTripDto>(`/trips/${tripId}/picks`, { locationIds });
    return res.data;
  },

  async cook(tripId: string): Promise<EnrichedTripDto> {
    const res = await apiClient.post<EnrichedTripDto>(`/trips/${tripId}/cook`);
    return res.data;
  },

  async setAccommodation(
    tripId: string,
    body: {
      mode: 'VIBE' | 'CUSTOM';
      vibe?: StayVibe;
      locationId?: string;
      customName?: string;
      customAddress?: string;
      customLat?: number;
      customLng?: number;
    },
  ): Promise<EnrichedTripDto> {
    const res = await apiClient.put<EnrichedTripDto>(`/trips/${tripId}/accommodation`, body);
    return res.data;
  },

  async reorderBlocks(
    tripId: string,
    items: { blockId: string; tripDayId: string | null; orderIndex: number }[],
  ): Promise<{ ok: boolean }> {
    const res = await apiClient.post<{ ok: boolean }>(`/trips/${tripId}/blocks/reorder`, { items });
    return res.data;
  },

  async swapCandidates(tripId: string, blockId: string): Promise<FeaturedLocationDto[]> {
    const res = await apiClient.get<FeaturedLocationDto[] | { items: FeaturedLocationDto[] }>(
      `/trips/${tripId}/blocks/${blockId}/swap-candidates`,
    );
    return Array.isArray(res.data) ? res.data : (res.data.items ?? []);
  },

  async swapBlock(
    tripId: string,
    blockId: string,
    body: {
      locationId?: string;
      customName?: string;
      customAddress?: string;
      customLat?: number;
      customLng?: number;
    },
  ): Promise<EventBlockDto> {
    const res = await apiClient.post<EventBlockDto>(`/trips/${tripId}/blocks/${blockId}/swap`, body);
    return res.data;
  },

  async createCheckIn(
    tripId: string,
    body: {
      eventBlockId?: string;
      note?: string;
      latitude?: number;
      longitude?: number;
      checkedInAt?: string;
    },
  ): Promise<TripCheckInDto> {
    const res = await apiClient.post<TripCheckInDto>(`/trips/${tripId}/check-ins`, body);
    return res.data;
  },

  async attachCheckInMedia(tripId: string, checkInId: string, mediaId: string): Promise<TripCheckInDto> {
    const res = await apiClient.post<TripCheckInDto>(`/trips/${tripId}/check-ins/${checkInId}/media`, {
      mediaId,
    });
    return res.data;
  },

  async listCheckIns(tripId: string): Promise<{ items: TripCheckInDto[] }> {
    const res = await apiClient.get<{ items: TripCheckInDto[] }>(`/trips/${tripId}/check-ins`);
    return res.data;
  },

  async assembleDraftPost(tripId: string): Promise<AssembleDraftResult> {
    const res = await apiClient.post<AssembleDraftResult>(`/trips/${tripId}/assemble-draft-post`);
    return res.data;
  },

  async getEnrichedTrip(tripId: string): Promise<EnrichedTripDto> {
    const res = await apiClient.get<EnrichedTripDto>(`/trips/${tripId}`);
    return res.data;
  },
};

export type { CookAccommodationDto, EnrichedTripDto };
