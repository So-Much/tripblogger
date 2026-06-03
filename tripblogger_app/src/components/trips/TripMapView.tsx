import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline, type MapPressEvent, type Region } from 'react-native-maps';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TripLegDirectionMarker } from '@/src/components/trips/TripLegDirectionMarker';
import { TripMapLabeledMarker } from '@/src/components/trips/TripMapLabeledMarker';
import { TripRouteStopMarker } from '@/src/components/trips/TripRouteStopMarker';
import type { LegDirectionMarker } from '@/src/utils/leg-bearing';
import type { MapCheckpoint, MapExplorePin, MapRouteStop } from '@/src/types/trip-map';
import type { UserMapMarker } from '@/src/store/user-map-markers.store';
import type { LocationTypeRef } from '@/src/utils/location-type-display';

type LatLng = { latitude: number; longitude: number };

export type PlannerMapStop = {
  clientId: string;
  lat: number;
  lng: number;
  name: string;
  sequenceNumber: number;
  locationType?: LocationTypeRef | null;
};

export type TripMapViewHandle = {
  fitToCoordinates: (coords: LatLng[]) => void;
};

type TripMapViewProps = {
  center: LatLng | null;
  checkpoint: MapCheckpoint | null;
  navigationDestination?: MapCheckpoint | null;
  pins: MapExplorePin[];
  routeStops?: MapRouteStop[];
  polylineCoords?: LatLng[];
  upcomingPolyline?: LatLng[];
  completedPolyline?: LatLng[];
  routeStopDisplayMode?: 'default' | 'minimal';
  directionPolyline?: LatLng[];
  plannerStops?: PlannerMapStop[];
  legDirectionMarkers?: LegDirectionMarker[];
  fitBounds?: LatLng[];
  dimUnselectedPins?: boolean;
  selectedPinId?: string | null;
  customMarkers?: UserMapMarker[];
  pendingMarker?: { lat: number; lng: number; name: string } | null;
  allowMapPress?: boolean;
  followUser?: boolean;
  liveUserPosition?: { lat: number; lng: number } | null;
  userHeading?: number | null;
  onMapPress?: (coords: { lat: number; lng: number }) => void;
  onPinPress?: (pin: MapExplorePin) => void;
  onCheckpointPress?: (checkpoint: MapCheckpoint) => void;
  onCustomMarkerPress?: (marker: UserMapMarker) => void;
  onRouteStopPress?: (stop: MapRouteStop) => void;
};

const DEFAULT_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };
const NAV_ZOOM = 17;

export const TripMapView = forwardRef<TripMapViewHandle, TripMapViewProps>(function TripMapView(
  {
    center,
    checkpoint,
    navigationDestination,
    pins,
    routeStops = [],
    polylineCoords = [],
    upcomingPolyline = [],
    completedPolyline = [],
    routeStopDisplayMode = 'default',
    directionPolyline = [],
    plannerStops = [],
    legDirectionMarkers = [],
    fitBounds,
    dimUnselectedPins = false,
    selectedPinId,
    customMarkers = [],
    pendingMarker,
    allowMapPress = true,
    followUser = false,
    liveUserPosition,
    userHeading,
    onMapPress,
    onPinPress,
    onCheckpointPress,
    onCustomMarkerPress,
    onRouteStopPress,
  },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const tint = useThemeColor({}, 'tint');
  const accent = useThemeColor({}, 'accent');
  const muted = useThemeColor({}, 'textMuted');
  const didFitNavRef = useRef(false);

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coords: LatLng[]) => {
      if (!mapRef.current || coords.length === 0) return;
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 120, right: 48, bottom: 280, left: 48 },
        animated: true,
      });
    },
  }));

  useEffect(() => {
    if (followUser || !mapRef.current || !fitBounds?.length) return;
    mapRef.current.fitToCoordinates(fitBounds, {
      edgePadding: { top: 120, right: 48, bottom: 280, left: 48 },
      animated: true,
    });
  }, [fitBounds, followUser]);

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

  const destMarker =
    navigationDestination ?? (followUser || plannerStops.length > 0 ? null : checkpoint);
  const routeLine = directionPolyline.length > 1 ? directionPolyline : polylineCoords;

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

        {!followUser && routeLine.length > 1 ? (
          <Polyline
            coordinates={routeLine}
            strokeColor={plannerStops.length > 0 ? tint : muted}
            strokeWidth={plannerStops.length > 0 ? 4 : 3}
            lineDashPattern={plannerStops.length > 0 ? undefined : [8, 6]}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {!followUser && completedPolyline.length > 1 ? (
          <Polyline
            coordinates={completedPolyline}
            strokeColor={muted}
            strokeWidth={3}
            lineDashPattern={[6, 6]}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {!followUser && upcomingPolyline.length > 1 && plannerStops.length === 0 ? (
          <Polyline coordinates={upcomingPolyline} strokeColor={tint} strokeWidth={4} lineCap="round" lineJoin="round" />
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
          legDirectionMarkers.map((leg) => <TripLegDirectionMarker key={leg.id} marker={leg} />)}

        {!followUser &&
          plannerStops.map((stop) => (
            <TripMapLabeledMarker
              key={`plan-${stop.clientId}`}
              latitude={stop.lat}
              longitude={stop.lng}
              name={stop.name}
              locationType={stop.locationType}
              variant="route"
              sequenceNumber={stop.sequenceNumber}
              selected
              onPress={() =>
                onCheckpointPress?.({
                  lat: stop.lat,
                  lng: stop.lng,
                  name: stop.name,
                  locationType: stop.locationType,
                })
              }
            />
          ))}

        {!followUser &&
          routeStops
            .filter((s) => s.status !== 'SKIPPED')
            .map((stop) =>
              routeStopDisplayMode === 'minimal' ? (
                <TripRouteStopMarker
                  key={`route-${stop.id}`}
                  stop={stop}
                  sequenceIndex={stop.sequenceIndex}
                  onPress={() => onRouteStopPress?.(stop)}
                />
              ) : (
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
              ),
            )}

        {!followUser &&
          customMarkers.map((marker) => {
            const pinId = `user-marker:${marker.id}`;
            const isSelected = selectedPinId === pinId;
            return (
              <TripMapLabeledMarker
                key={pinId}
                latitude={marker.lat}
                longitude={marker.lng}
                name={marker.name}
                locationType={{ code: 'other', name: 'Mốc riêng' }}
                variant="nearby"
                selected={isSelected}
                onPress={() => onCustomMarkerPress?.(marker)}
              />
            );
          })}

        {!followUser && pendingMarker ? (
          <TripMapLabeledMarker
            latitude={pendingMarker.lat}
            longitude={pendingMarker.lng}
            name={pendingMarker.name}
            locationType={{ code: 'other', name: 'Mốc riêng' }}
            variant="checkpoint"
            selected
          />
        ) : null}

        {!followUser &&
          pins.map((pin) => {
            const isSelected = selectedPinId === pin.id;
            if (dimUnselectedPins && !isSelected && selectedPinId) return null;
            return (
              <TripMapLabeledMarker
                key={pin.id}
                latitude={pin.latitude}
                longitude={pin.longitude}
                name={pin.name}
                locationType={pin.locationType}
                variant="nearby"
                selected={isSelected}
                onPress={() => onPinPress?.(pin)}
              />
            );
          })}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
