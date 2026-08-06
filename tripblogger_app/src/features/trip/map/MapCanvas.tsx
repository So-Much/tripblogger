import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  type LongPressEvent,
  type Region,
  type Camera,
} from 'react-native-maps';
import { useMapStore } from '../store/map.store';
import { decodePolyline6 } from '../utils/geo';
import type { MapCanvasHandle } from './map-canvas-types';
import { DEFAULT_MAP_CENTER, type MapTypeId } from './map-style';

export type { MapCanvasHandle } from './map-canvas-types';

type Props = {
  userLat?: number;
  userLng?: number;
  onMapIdleCenter?: (lat: number, lng: number) => void;
  onLongPress?: (lat: number, lng: number) => void;
  onPoiPress?: (placeId: string) => void;
};

export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  { userLat, userLng, onMapIdleCenter, onLongPress, onPoiPress },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region | null>(null);
  const followMode = useMapStore((s) => s.followMode);
  const setFollowMode = useMapStore((s) => s.setFollowMode);
  const setBearing = useMapStore((s) => s.setBearing);
  const nearbyPlaces = useMapStore((s) => s.nearbyPlaces);
  const selectedPlace = useMapStore((s) => s.selectedPlace);
  const routeResult = useMapStore((s) => s.routeResult);
  const selectedRouteIndex = useMapStore((s) => s.selectedRouteIndex);
  const mapStyleVariant = useMapStore((s) => s.mapStyleVariant);

  const mapType: MapTypeId =
    mapStyleVariant === 'dark'
      ? Platform.OS === 'ios'
        ? 'mutedStandard'
        : 'standard'
      : 'standard';

  const initialRegion = useMemo<Region>(() => {
    if (userLat != null && userLng != null) {
      return {
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }
    return DEFAULT_MAP_CENTER;
  }, [userLat, userLng]);

  useImperativeHandle(ref, () => ({
    flyTo: (lng, lat, zoom) => {
      const latitudeDelta = zoom != null ? Math.max(0.002, 0.2 / Math.pow(2, zoom - 10)) : 0.01;
      mapRef.current?.animateToRegion(
        {
          latitude: lat,
          longitude: lng,
          latitudeDelta,
          longitudeDelta: latitudeDelta,
        },
        600,
      );
    },
    fitRoute: (coordinates) => {
      if (coordinates.length < 2 || !mapRef.current) return;
      // coordinates are [lng, lat]
      mapRef.current.fitToCoordinates(
        coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
        {
          edgePadding: { top: 120, right: 40, bottom: 280, left: 40 },
          animated: true,
        },
      );
    },
    resetNorth: () => {
      const cam: Partial<Camera> = {
        heading: 0,
        pitch: 0,
        center:
          userLat != null && userLng != null
            ? { latitude: userLat, longitude: userLng }
            : {
                latitude: regionRef.current?.latitude ?? DEFAULT_MAP_CENTER.latitude,
                longitude: regionRef.current?.longitude ?? DEFAULT_MAP_CENTER.longitude,
              },
      };
      mapRef.current?.animateCamera(cam, { duration: 400 });
      setBearing(0);
    },
  }));

  // Follow / follow-heading camera
  useEffect(() => {
    if (!mapRef.current || userLat == null || userLng == null) return;
    if (followMode === 'free') return;

    if (followMode === 'follow') {
      mapRef.current.animateCamera(
        {
          center: { latitude: userLat, longitude: userLng },
          heading: 0,
          pitch: 0,
          zoom: 15,
        },
        { duration: 500 },
      );
      return;
    }

    // follow-heading
    mapRef.current.animateCamera(
      {
        center: { latitude: userLat, longitude: userLng },
        pitch: 45,
        zoom: 17,
      },
      { duration: 400 },
    );
  }, [followMode, userLat, userLng]);

  const routeCoords = useMemo(() => {
    const route = routeResult?.routes[selectedRouteIndex];
    if (!route?.geometry) return [] as { latitude: number; longitude: number }[];
    return decodePolyline6(route.geometry).map(([longitude, latitude]) => ({
      latitude,
      longitude,
    }));
  }, [routeResult, selectedRouteIndex]);

  const altRoutes = useMemo(() => {
    if (!routeResult?.routes.length) return [];
    return routeResult.routes.map((r, i) => ({
      index: i,
      selected: i === selectedRouteIndex,
      coords: decodePolyline6(r.geometry).map(([longitude, latitude]) => ({
        latitude,
        longitude,
      })),
    }));
  }, [routeResult, selectedRouteIndex]);

  const visiblePois = useMemo(() => nearbyPlaces.slice(0, 80), [nearbyPlaces]);

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled
        pitchEnabled
        followsUserLocation={followMode === 'follow' || followMode === 'follow-heading'}
        userLocationUpdateInterval={2000}
        onPress={() => {
          if (followMode !== 'free') setFollowMode('free');
        }}
        onLongPress={(e: LongPressEvent) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          onLongPress?.(latitude, longitude);
        }}
        onRegionChangeComplete={(region) => {
          regionRef.current = region;
          setBearing(0);
          onMapIdleCenter?.(region.latitude, region.longitude);
        }}
        onPanDrag={() => {
          if (followMode !== 'free') setFollowMode('free');
        }}>
        {visiblePois.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            pinColor="#0EA5E9"
            title={p.name}
            description={p.address ?? undefined}
            onPress={(e) => {
              e.stopPropagation?.();
              onPoiPress?.(p.id);
            }}
          />
        ))}

        {selectedPlace ? (
          <Marker
            coordinate={{ latitude: selectedPlace.lat, longitude: selectedPlace.lng }}
            pinColor="#DC2626"
            title={selectedPlace.name}
          />
        ) : null}

        {altRoutes.map((r) =>
          r.coords.length > 1 ? (
            <Polyline
              key={`alt-${r.index}`}
              coordinates={r.coords}
              strokeColor={r.selected ? '#0284C7' : '#94A3B8'}
              strokeWidth={r.selected ? 5 : 4}
              lineCap="round"
              lineJoin="round"
              zIndex={r.selected ? 2 : 1}
            />
          ) : null,
        )}

        {routeCoords.length > 1 && altRoutes.length === 0 ? (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#0284C7"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
      </MapView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
});
