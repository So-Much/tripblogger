export const PLACE_EVENTS_STREAM = 'place.events';

/** Payload for `place.created` / `place.updated`. `version` lets consumers drop stale events. */
export type PlaceChangedPayload = {
  placeId: string;
  version: number;
  name: string;
  category: string;
  address: string | null;
  lat: number;
  lng: number;
  openingHoursRaw: string | null;
};
