export type PoiCategoryId =
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'homestay'
  | 'shopping'
  | 'fuel'
  | 'hospital'
  | 'atm'
  | 'attraction'
  | 'parking';

export type MapPlace = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  source: 'db' | 'overpass' | 'photon' | 'nominatim';
  distanceM: number | null;
  rating: number | null;
};

export type TravelMode = 'car' | 'bike' | 'foot';

export type RouteStep = {
  distanceM: number;
  durationS: number;
  instruction: string;
  name: string;
  maneuverType: string;
  modifier?: string;
  location: { lat: number; lng: number };
};

export type RouteAlternative = {
  distanceM: number;
  durationS: number;
  geometry: string;
  steps: RouteStep[];
};

export type MapRouteResponse = {
  routes: RouteAlternative[];
  mode: TravelMode;
};

export type CameraFollowMode = 'free' | 'follow' | 'follow-heading';

export type TripBottomTab = 'explore' | 'you' | 'contribute';

export const POI_CATEGORIES: {
  id: PoiCategoryId;
  labelKey: string;
  icon:
    | 'restaurant'
    | 'hotel'
    | 'house'
    | 'local-cafe'
    | 'shopping-bag'
    | 'local-gas-station'
    | 'local-hospital'
    | 'atm'
    | 'attractions'
    | 'local-parking';
}[] = [
  { id: 'restaurant', labelKey: 'mapCatRestaurant', icon: 'restaurant' },
  { id: 'hotel', labelKey: 'mapCatHotel', icon: 'hotel' },
  { id: 'homestay', labelKey: 'mapCatHomestay', icon: 'house' },
  { id: 'cafe', labelKey: 'mapCatCafe', icon: 'local-cafe' },
  { id: 'shopping', labelKey: 'mapCatShopping', icon: 'shopping-bag' },
  { id: 'fuel', labelKey: 'mapCatFuel', icon: 'local-gas-station' },
  { id: 'hospital', labelKey: 'mapCatHospital', icon: 'local-hospital' },
  { id: 'atm', labelKey: 'mapCatAtm', icon: 'atm' },
  { id: 'attraction', labelKey: 'mapCatAttraction', icon: 'attractions' },
  { id: 'parking', labelKey: 'mapCatParking', icon: 'local-parking' },
];
