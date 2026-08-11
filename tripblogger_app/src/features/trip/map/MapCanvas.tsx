import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { InteractionManager, Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  type LongPressEvent,
  type Region,
  type Camera,
} from 'react-native-maps';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTripDetail } from '../hooks/useTripDetail';
import { MARKER_PAINT_FREEZE_MS } from '../store/category-change';
import { useMapStore } from '../store/map.store';
import { usePlanStore } from '../store/plan.store';
import { decodePolyline6 } from '../utils/geo';
import { CategoryMapMarker } from './CategoryMapMarker';
import { NumberedPlanMarker } from './NumberedPlanMarker';
import type { MapCanvasHandle } from './map-canvas-types';
import { computeMarkerPaintDelayMs } from './marker-paint';
import { DEFAULT_MAP_CENTER, type MapTypeId } from './map-style';

export type { MapCanvasHandle } from './map-canvas-types';

/** Extra hold on epoch bump; store freeze usually covers sheet settle. */
const MARKER_SWAP_SETTLE_MS = MARKER_PAINT_FREEZE_MS;

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
  const nearbyEpoch = useMapStore((s) => s.nearbyEpoch);
  const markerPaintFreezeUntil = useMapStore((s) => s.markerPaintFreezeUntil);
  const selectedPlace = useMapStore((s) => s.selectedPlace);
  const activeSheet = useMapStore((s) => s.activeSheet);
  const routeResult = useMapStore((s) => s.routeResult);
  const selectedRouteIndex = useMapStore((s) => s.selectedRouteIndex);
  const mapStyleVariant = useMapStore((s) => s.mapStyleVariant);
  const bottomTab = useMapStore((s) => s.bottomTab);
  const activeTripId = usePlanStore((s) => s.activeTripId);
  const selectedDayId = usePlanStore((s) => s.selectedDayId);
  const planTint = useThemeColor({}, 'tint');
  const planOnCta = useThemeColor({}, 'onCta');

  const planDetailQuery = useTripDetail(
    bottomTab === 'plan' && selectedDayId ? activeTripId : null,
  );
  const planDayStops = useMemo(() => {
    if (bottomTab !== 'plan' || !selectedDayId || !planDetailQuery.data) return [];
    const day = planDetailQuery.data.days.find((d) => d.id === selectedDayId);
    if (!day) return [];
    return [...day.stops]
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .sort((a, b) => a.position - b.position);
  }, [bottomTab, selectedDayId, planDetailQuery.data]);

  // Painted marker list is intentionally lagged behind the store so we never
  // empty→remount custom Markers in the same frame as PlaceDetail hide /
  // Explore reappear (native crash vector on react-native-maps).
  const [paintedPlaces, setPaintedPlaces] = useState(nearbyPlaces);
  const paintedEpochRef = useRef(nearbyEpoch);
  const holdSwapUntilRef = useRef(0);

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
      // Drop follow so fitToCoordinates isn't fighting the native follow camera.
      if (useMapStore.getState().followMode !== 'free') {
        setFollowMode('free');
      }
      // coordinates are [lng, lat]
      const points = coordinates
        .filter(
          ([longitude, latitude]) =>
            Number.isFinite(latitude) && Number.isFinite(longitude),
        )
        .map(([longitude, latitude]) => ({ latitude, longitude }));
      if (points.length < 2) return;
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 120, right: 40, bottom: 280, left: 40 },
        animated: true,
      });
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

  useEffect(() => {
    const now = Date.now();
    const epochBumped = nearbyEpoch !== paintedEpochRef.current;
    if (epochBumped) {
      paintedEpochRef.current = nearbyEpoch;
    }

    const { delayMs, nextHoldUntil } = computeMarkerPaintDelayMs({
      now,
      freezeUntil: markerPaintFreezeUntil,
      epochBumped,
      settleMs: MARKER_SWAP_SETTLE_MS,
      holdSwapUntil: holdSwapUntilRef.current,
    });
    holdSwapUntilRef.current = nextHoldUntil;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let interactionHandle: { cancel: () => void } | null = null;

    const scheduleApply = () => {
      interactionHandle = InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        // Re-check freeze in case a newer tag/place transition extended it.
        const state = useMapStore.getState();
        const remaining = Math.max(0, state.markerPaintFreezeUntil - Date.now());
        if (remaining > 0) {
          timeoutId = setTimeout(() => {
            if (!cancelled) scheduleApply();
          }, remaining);
          return;
        }
        setPaintedPlaces(state.nearbyPlaces);
      });
    };

    if (delayMs > 0) {
      // Keep current pins on-screen while PlaceDetail hides / Explore springs.
      timeoutId = setTimeout(scheduleApply, delayMs);
    } else {
      scheduleApply();
    }

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      interactionHandle?.cancel?.();
    };
  }, [nearbyPlaces, nearbyEpoch, markerPaintFreezeUntil]);

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
      coords:
        typeof r.geometry === 'string' && r.geometry.length > 0
          ? decodePolyline6(r.geometry).map(([longitude, latitude]) => ({
              latitude,
              longitude,
            }))
          : ([] as { latitude: number; longitude: number }[]),
    }));
  }, [routeResult, selectedRouteIndex]);

  const visiblePois = useMemo(
    () =>
      paintedPlaces
        .filter(
          (p) =>
            !!p?.id &&
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lng),
        )
        .slice(0, 80),
    [paintedPlaces],
  );

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
          // Avoid needless store writes (bearing already 0) — each set() re-renders
          // subscribers and previously retriggered an unstable onFitRoute loop.
          if (Math.abs(useMapStore.getState().bearing) > 0.5) {
            setBearing(0);
          }
          onMapIdleCenter?.(region.latitude, region.longitude);
        }}
        onPanDrag={() => {
          if (followMode !== 'free') setFollowMode('free');
        }}>
        {visiblePois.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.name}
            description={p.address ?? undefined}
            anchor={{ x: 0.5, y: 1 }}
            // Permanent false: pulsing tracksViewChanges while markers remount crashes.
            tracksViewChanges={false}
            // Do not bind zIndex/selected to store selection: with tracksViewChanges
            // false the bitmap won't update anyway, but zIndex churn on tag/place
            // close still hits the native map and contributes to crashes.
            zIndex={1}
            onPress={(e) => {
              e.stopPropagation?.();
              onPoiPress?.(p.id);
            }}>
            <CategoryMapMarker category={p.category} selected={false} />
          </Marker>
        ))}

        {/* Orphan selected pin only while place/directions is open — dropped pins
            / search picks that are not in the painted nearby list. */}
        {selectedPlace &&
        (activeSheet === 'place' || activeSheet === 'directions') &&
        Number.isFinite(selectedPlace.lat) &&
        Number.isFinite(selectedPlace.lng) &&
        !visiblePois.some((p) => p.id === selectedPlace.id) ? (
          <Marker
            key={`selected:${selectedPlace.id}`}
            coordinate={{ latitude: selectedPlace.lat, longitude: selectedPlace.lng }}
            title={selectedPlace.name}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            zIndex={2}>
            <CategoryMapMarker category={selectedPlace.category} selected />
          </Marker>
        ) : null}

        {/* Plan-day numbered stops — separate layer; only while Plan tab + day selected. */}
        {planDayStops.map((stop, index) => (
          <Marker
            key={`plan-stop:${stop.id}`}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            title={stop.name}
            description={stop.address ?? undefined}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            zIndex={3}>
            <NumberedPlanMarker
              number={index + 1}
              color={planTint}
              textColor={planOnCta}
            />
          </Marker>
        ))}

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
