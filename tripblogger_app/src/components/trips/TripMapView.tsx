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
  pins: MapExplorePin[];
  routeStops?: MapRouteStop[];
  polylineCoords?: LatLng[];
  upcomingPolyline?: LatLng[];
  selectedPinId?: string | null;
  onMapPress?: (coords: { lat: number; lng: number }) => void;
  onPinPress?: (pin: MapExplorePin) => void;
  onCheckpointPress?: (checkpoint: MapCheckpoint) => void;
  onRouteStopPress?: (stop: MapRouteStop) => void;
};

const DEFAULT_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };

export function TripMapView({
  center,
  checkpoint,
  pins,
  routeStops = [],
  polylineCoords = [],
  upcomingPolyline = [],
  selectedPinId,
  onMapPress,
  onPinPress,
  onCheckpointPress,
  onRouteStopPress,
}: TripMapViewProps) {
  const mapRef = useRef<MapView>(null);
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'textMuted');

  useEffect(() => {
    if (!center || !mapRef.current) return;
    const region: Region = {
      latitude: center.latitude,
      longitude: center.longitude,
      ...DEFAULT_DELTA,
    };
    mapRef.current.animateToRegion(region, 350);
  }, [center]);

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onMapPress?.({ lat: latitude, lng: longitude });
  };

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
        onPress={handleMapPress}>
        {checkpoint ? (
          <TripMapLabeledMarker
            latitude={checkpoint.lat}
            longitude={checkpoint.lng}
            name={checkpoint.name}
            variant="checkpoint"
            onPress={() => onCheckpointPress?.(checkpoint)}
          />
        ) : null}

        {polylineCoords.length > 1 ? (
          <Polyline coordinates={polylineCoords} strokeColor={muted} strokeWidth={3} lineDashPattern={[8, 6]} />
        ) : null}

        {upcomingPolyline.length > 1 ? (
          <Polyline coordinates={upcomingPolyline} strokeColor={tint} strokeWidth={4} />
        ) : null}

        {routeStops
          .filter((s) => s.status !== 'SKIPPED')
          .map((stop) => (
            <TripMapLabeledMarker
              key={`route-${stop.id}`}
              latitude={stop.latitude}
              longitude={stop.longitude}
              name={stop.name}
              variant="route"
              selected={stop.status === 'VISITING'}
              onPress={() => onRouteStopPress?.(stop)}
            />
          ))}

        {pins.map((pin) => (
          <TripMapLabeledMarker
            key={pin.id}
            latitude={pin.latitude}
            longitude={pin.longitude}
            name={pin.name}
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
