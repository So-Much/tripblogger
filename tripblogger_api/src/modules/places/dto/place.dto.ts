export type PlaceSource = 'photon' | 'nominatim';

export class PlaceResultDto {
  id!: string;
  name!: string;
  address?: string;
  lat!: number;
  lng!: number;
  source!: PlaceSource;
}
