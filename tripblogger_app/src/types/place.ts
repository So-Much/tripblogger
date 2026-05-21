export type PlaceDto = {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  source: 'photon' | 'nominatim';
};

export type ComposerLocation = {
  name: string;
  lat: number;
  lng: number;
};
