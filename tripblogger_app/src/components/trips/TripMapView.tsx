import { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline, type MapPressEvent, type Region } from 'react-native-maps';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TripMapLabeledMarker } from '@/src/components/trips/TripMapLabeledMarker';
import type { MapCheckpoint, MapExplorePin, MapRouteStop } from '@/src/types/trip-map';

type LatLng = { latitude: number; longitude: number };

type TripMapViewProps = {
  center: LatLng | null;
  checkpoint: MapCheckpoint | null;
  navigationDestination?: MapCheckpoint | null;
  pins: MapExplorePin[];
  routeStops?: MapRouteStop[];
  polylineCoords?: LatLng[];
  upcomingPolyline?: LatLng[];
  directionPolyline?: LatLng[];
  selectedPinId?: string | null;
  allowMapPress?: boolean;
  followUser?: boolean;
  liveUserPosition?: { lat: number; lng: number } | null;
  userHeading?: number | null;
  onMapPress?: (coords: { lat: number; lng: number }) => void;
  onPinPress?: (pin: MapExplorePin) => void;
  onCheckpointPress?: (checkpoint: MapCheckpoint) => void;
  onRouteStopPress?: (stop: MapRouteStop) => void;
};

const DEFAULT_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };
const NAV_ZOOM = 17;

export function TripMapView({
  center,
  checkpoint,
  navigationDestination,
  pins,
  routeStops = [],
  polylineCoords = [],
  upcomingPolyline = [],
  directionPolyline = [],
  selectedPinId,
  allowMapPress = true,
  followUser = false,
  liveUserPosition,
  userHeading,
  onMapPress,
  onPinPress,
  onCheckpointPress,
  onRouteStopPress,
}: TripMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const tint = useThemeColor({}, 'tint');
  const accent = useThemeColor({}, 'accent');
  const muted = useThemeColor({}, 'textMuted');
  const didFitNavRef = useRef(false);

  useEffect(() => {
    if (followUser) return;
    if (!mapRef.current || directionPolyline.length > 1) return;
    if (!center) return;
    const region: Region = {
      latitude: center.latitude,
      longitude: center.longitude,
      ...DEFAULT_DELTA,
    };
    mapRef.current.animateToRegion(region, 350);
  }, [center, directionPolyline.length, followUser]);

  useEffect(() => {
    if (followUser || !mapRef.current || directionPolyline.length < 2) return;
    mapRef.current.fitToCoordinates(directionPolyline, {
      edgePadding: { top: 120, right: 48, bottom: 220, left: 48 },
      animated: true,
    });
  }, [directionPolyline, followUser]);

  useEffect(() => {
    if (!followUser || !mapRef.current || directionPolyline.length < 2) return;
    if (didFitNavRef.current) return;
    didFitNavRef.current = true;
    mapRef.current.fitToCoordinates(directionPolyline, {
      edgePadding: { top: 140, right: 56, bottom: 200, left: 56 },
      animated: true,
    });
  }, [followUser, directionPolyline]);

  useEffect(() => {
    if (!followUser) {
      didFitNavRef.current = false;
    }
  }, [followUser]);

  useEffect(() => {
    if (!followUser || !liveUserPosition || !mapRef.current) return;
    mapRef.current.animateCamera(
      {
        center: { latitude: liveUserPosition.lat, longitude: liveUserPosition.lng },
        heading: userHeading != null && userHeading >= 0 ? userHeading : 0,
        pitch: 0,
        zoom: NAV_ZOOM,
      },
      { duration: 450 },
    );
  }, [followUser, liveUserPosition, userHeading]);

  const handleMapPress = (e: MapPressEvent) => {
    if (!allowMapPress) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onMapPress?.({ lat: latitude, lng: longitude });
  };

  const destMarker = navigationDestination ?? (followUser ? null : checkpoint);

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={
          center
            ? { latitude: center.latitude, longitude: center.longitude, ...DEFAULT_DELTA }
            : undefined
        }
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation={followUser}
        showsUserHeading={followUser}
        onPress={handleMapPress}>
        {destMarker && !navigationDestination ? (
          <TripMapLabeledMarker
            latitude={destMarker.lat}
            longitude={destMarker.lng}
            name={destMarker.name}
            locationType={destMarker.locationType}
            variant="checkpoint"
            onPress={() => onCheckpointPress?.(destMarker)}
          />
        ) : null}

        {navigationDestination ? (
          <TripMapLabeledMarker
            latitude={navigationDestination.lat}
            longitude={navigationDestination.lng}
            name={navigationDestination.name}
            locationType={navigationDestination.locationType}
            variant="nearby"
            selected
            onPress={() => onCheckpointPress?.(navigationDestination)}
          />
        ) : null}

        {!followUser && polylineCoords.length > 1 ? (
          <Polyline coordinates={polylineCoords} strokeColor={muted} strokeWidth={3} lineDashPattern={[8, 6]} />
        ) : null}

        {!followUser && upcomingPolyline.length > 1 ? (
          <Polyline coordinates={upcomingPolyline} strokeColor={tint} strokeWidth={4} />
        ) : null}

        {directionPolyline.length > 1 ? (
          <Polyline
            coordinates={directionPolyline}
            strokeColor={accent}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {!followUser &&
          routeStops
            .filter((s) => s.status !== 'SKIPPED')
            .map((stop) => (
              <TripMapLabeledMarker
                key={`route-${stop.id}`}
                latitude={stop.latitude}
                longitude={stop.longitude}
                name={stop.name}
                locationType={stop.locationType}
                variant="route"
                selected={stop.status === 'VISITING'}
                onPress={() => onRouteStopPress?.(stop)}
              />
            ))}

        {!followUser &&
          pins.map((pin) => (
            <TripMapLabeledMarker
              key={pin.id}
              latitude={pin.latitude}
              longitude={pin.longitude}
              name={pin.name}
              locationType={pin.locationType}
              variant="nearby"
              selected={selectedPinId === pin.id}
              onPress={() => onPinPress?.(pin)}
            />
          ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
