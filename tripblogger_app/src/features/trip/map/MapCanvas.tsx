import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { InteractionManager, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  type LongPressEvent,
  type Region,
  type Camera,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripDetail } from '../hooks/useTripDetail';
import {
  PLAN_CAMERA_DEBOUNCE_MS,
  canInvokeMapCamera,
  createCoalescedInvoker,
  createDeferredRunner,
  mapCameraAnimationDuration,
  planCameraEdgePadding,
  planStopFocusRegion,
  resolvePlanCameraTarget,
  safeInvoke,
  type CoalescedInvoker,
  type DeferredRunner,
} from '../plan/plan-camera';
import { planSheetPeekHeight } from '../plan/plan-sheet-layout';
import { isPlanTripInProgress } from '../plan/plan-trip-progress';
import { usePlanRouteChains } from '../plan/usePlanRouteChains';
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
  const cameraSigRef = useRef('');
  const dayFitSigRef = useRef('');
  const mountedRef = useRef(true);
  const mapReadyRef = useRef(false);
  const cameraGenerationRef = useRef(0);
  const lastCameraAtRef = useRef(0);
  const cameraRunnerRef = useRef<DeferredRunner | null>(null);
  const cameraCoalesceRef = useRef<CoalescedInvoker | null>(null);
  const [nativeFollow, setNativeFollow] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [hideNearbyForPlan, setHideNearbyForPlan] = useState(false);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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
  const sheetKind = usePlanStore((s) => s.sheetKind);
  const setFocusedStopId = usePlanStore((s) => s.setFocusedStopId);
  const cameraFocusStop = usePlanStore((s) => s.cameraFocusStop);
  const setCameraFocusStop = usePlanStore((s) => s.setCameraFocusStop);

  const planDetailQuery = useTripDetail(bottomTab === 'plan' ? activeTripId : null);

  useEffect(() => {
    mountedRef.current = true;
    const runner = createDeferredRunner({ delayMs: PLAN_CAMERA_DEBOUNCE_MS });
    const coalesce = createCoalescedInvoker();
    cameraRunnerRef.current = runner;
    cameraCoalesceRef.current = coalesce;
    return () => {
      mountedRef.current = false;
      mapReadyRef.current = false;
      cameraGenerationRef.current += 1;
      runner.dispose();
      coalesce.dispose();
      if (cameraRunnerRef.current === runner) cameraRunnerRef.current = null;
      if (cameraCoalesceRef.current === coalesce) cameraCoalesceRef.current = null;
    };
  }, []);

  const takeCameraPace = (intendedMs: number) => {
    const now = Date.now();
    const duration = mapCameraAnimationDuration(lastCameraAtRef.current, now, intendedMs);
    lastCameraAtRef.current = now;
    return { duration, animated: duration > 0 };
  };

  const runMapCamera = (generation: number, fn: (map: MapView) => void) => {
    cameraCoalesceRef.current?.run(() => {
      if (
        !canInvokeMapCamera({
          mounted: mountedRef.current,
          mapReady: mapReadyRef.current,
          generation: cameraGenerationRef.current,
          scheduledGeneration: generation,
        })
      ) {
        return;
      }
      const map = mapRef.current;
      if (!map) return;
      safeInvoke(() => fn(map));
    });
  };

  const dayChains = usePlanRouteChains({
    days: planDetailQuery.data?.days,
    defaultTravelMode: planDetailQuery.data?.defaultTravelMode,
    sheetKind,
    selectedDayId,
    enabled: bottomTab === 'plan' && !!planDetailQuery.data,
  });

  const [paintedPlanChains, setPaintedPlanChains] = useState(dayChains);

  useEffect(() => {
    const t = setTimeout(
      () => setPaintedPlanChains(bottomTab === 'plan' ? dayChains : []),
      PLAN_CAMERA_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [bottomTab, dayChains]);

  useEffect(() => {
    if (bottomTab !== 'plan') {
      setHideNearbyForPlan(false);
      return;
    }
    const t = setTimeout(() => setHideNearbyForPlan(true), PLAN_CAMERA_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [bottomTab]);

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
      runMapCamera(cameraGenerationRef.current, (map) => {
        map.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta,
            longitudeDelta: latitudeDelta,
          },
          takeCameraPace(600).duration,
        );
      });
    },
    fitRoute: (coordinates) => {
      if (coordinates.length < 2) return;
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
      runMapCamera(cameraGenerationRef.current, (map) => {
        map.fitToCoordinates(points, {
          edgePadding: { top: 120, right: 40, bottom: 280, left: 40 },
          animated: takeCameraPace(600).animated,
        });
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
      runMapCamera(cameraGenerationRef.current, (map) => {
        map.animateCamera(cam, { duration: takeCameraPace(400).duration });
      });
      setBearing(0);
    },
  }));

  // Follow / follow-heading camera
  useEffect(() => {
    if (bottomTab === 'plan') return;
    if (userLat == null || userLng == null) return;
    if (followMode === 'free') return;

    runMapCamera(cameraGenerationRef.current, (map) => {
      if (followMode === 'follow') {
        map.animateCamera(
          {
            center: { latitude: userLat, longitude: userLng },
            heading: 0,
            pitch: 0,
            zoom: 15,
          },
          { duration: takeCameraPace(500).duration },
        );
        return;
      }
      map.animateCamera(
        {
          center: { latitude: userLat, longitude: userLng },
          pitch: 45,
          zoom: 17,
        },
        { duration: takeCameraPace(400).duration },
      );
    });
  }, [bottomTab, followMode, userLat, userLng]);

  useEffect(() => {
    const wantFollow =
      bottomTab !== 'plan' &&
      (followMode === 'follow' || followMode === 'follow-heading');
    if (!wantFollow) {
      setNativeFollow(false);
      return;
    }
    const t = setTimeout(() => setNativeFollow(true), PLAN_CAMERA_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [bottomTab, followMode]);

  // Plan-tab camera: initial in-plan / follow-user / fit, then a one-shot fit
  // when switching day ↔ overview. Debounced so rapid tab/day changes never
  // call fitToCoordinates mid-layout.
  useEffect(() => {
    const gen = ++cameraGenerationRef.current;
    if (bottomTab !== 'plan') {
      cameraSigRef.current = '';
      dayFitSigRef.current = '';
      cameraRunnerRef.current?.cancel();
      return;
    }
    const trip = planDetailQuery.data;
    if (!trip) return;

    const user =
      userLat != null && userLng != null ? { lat: userLat, lng: userLng } : null;
    const inProgress = isPlanTripInProgress({
      now: new Date(),
      startDate: trip.startDate,
      endDate: trip.endDate,
      onPlanTab: true,
      tripSelected: true,
      status: trip.status,
    });
    const hasGps = user != null;
    const allStops = trip.days.flatMap((d) => d.stops);
    const target = resolvePlanCameraTarget({
      inProgress,
      user,
      stops: allStops,
    });
    const followOnce = target.kind === 'in-plan' || target.kind === 'follow-user';
    const followKey = `${trip.id}:${target.kind}:${hasGps ? 'gps' : 'nogps'}`;
    const dayKey = `${trip.id}:${sheetKind}:${selectedDayId ?? 'none'}`;

    // Drop Explore's persistent follow immediately so GPS ticks cannot yank Plan pans
    // while the one-shot camera animation is scheduled.
    if (useMapStore.getState().followMode !== 'free') {
      setFollowMode('free');
    }

    const topChrome = insets.top + 56 + 92 + 8 + 12;
    const bottomNav = Math.max(insets.bottom, 8) + 56;
    const sheetTopInset = insets.top + 56 + 92 + 8;
    const available = Math.max(180, windowHeight - sheetTopInset - bottomNav);
    const sheetPeek = planSheetPeekHeight(available) + bottomNav;
    const padding = planCameraEdgePadding({ topChrome, sheetPeek });

    const fitPoints = (
      map: MapView,
      points: { latitude: number; longitude: number }[],
    ) => {
      if (points.length === 0) return;
      const pace = takeCameraPace(600);
      if (points.length === 1) {
        map.animateToRegion(
          {
            latitude: points[0].latitude,
            longitude: points[0].longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          },
          pace.duration,
        );
        return;
      }
      map.fitToCoordinates(points, { edgePadding: padding, animated: pace.animated });
    };

    const visibleDays =
      sheetKind === 'overview'
        ? trip.days
        : sheetKind === 'ideas' || selectedDayId == null
          ? []
          : trip.days.filter((d) => d.id === selectedDayId);
    const visiblePoints = visibleDays.flatMap((day) =>
      day.stops
        .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
        .map((s) => ({ latitude: s.lat, longitude: s.lng })),
    );

    const run = () => {
      runMapCamera(gen, (map) => {
        if (followOnce && cameraSigRef.current !== followKey) {
          cameraSigRef.current = followKey;
          dayFitSigRef.current = dayKey;
          if (target.kind === 'in-plan') {
            if (useMapStore.getState().followMode !== 'free') setFollowMode('free');
            map.animateToRegion(
              {
                latitude: target.lat,
                longitude: target.lng,
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
              },
              takeCameraPace(600).duration,
            );
            return;
          }
          // One-shot fly to the user; do not leave followMode on (that locks pan).
          if (hasGps && user) {
            map.animateToRegion(
              {
                latitude: user.lat,
                longitude: user.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              },
              takeCameraPace(600).duration,
            );
          } else if (visiblePoints.length > 0) {
            fitPoints(map, visiblePoints);
          }
          return;
        }

        if (followOnce && useMapStore.getState().followMode !== 'free') {
          return;
        }

        // Wait for PlanTimeline to pick a day so we don't fit-all then fit-day.
        if (sheetKind === 'day' && selectedDayId == null) return;

        if (dayFitSigRef.current === dayKey) return;
        dayFitSigRef.current = dayKey;

        if (useMapStore.getState().followMode !== 'free') setFollowMode('free');
        if (visiblePoints.length > 0) {
          fitPoints(map, visiblePoints);
          return;
        }
        if (Number.isFinite(trip.destinationLat) && Number.isFinite(trip.destinationLng)) {
          map.animateToRegion(
            {
              latitude: trip.destinationLat,
              longitude: trip.destinationLng,
              latitudeDelta: 0.08,
              longitudeDelta: 0.08,
            },
            takeCameraPace(600).duration,
          );
        }
      });
    };

    cameraRunnerRef.current?.schedule(run);
    return () => {
      cameraGenerationRef.current += 1;
      cameraRunnerRef.current?.cancel();
    };
  }, [
    bottomTab,
    planDetailQuery.data,
    userLat,
    userLng,
    insets.top,
    insets.bottom,
    windowHeight,
    setFollowMode,
    sheetKind,
    selectedDayId,
    mapReady,
  ]);

  // List-row tap: one-shot fly to that stop, then leave the map pannable.
  useEffect(() => {
    if (bottomTab !== 'plan' || !cameraFocusStop) return;
    if (!Number.isFinite(cameraFocusStop.lat) || !Number.isFinite(cameraFocusStop.lng)) {
      setCameraFocusStop(null);
      return;
    }

    const region = planStopFocusRegion(cameraFocusStop);

    cameraRunnerRef.current?.schedule(() => {
      runMapCamera(cameraGenerationRef.current, (map) => {
        if (useMapStore.getState().followMode !== 'free') {
          setFollowMode('free');
        }
        map.animateToRegion(region, takeCameraPace(600).duration);
        setCameraFocusStop(null);
      });
    });

    return () => {
      cameraRunnerRef.current?.cancel();
    };
  }, [
    bottomTab,
    cameraFocusStop,
    mapReady,
    setCameraFocusStop,
    setFollowMode,
  ]);

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
      hideNearbyForPlan
        ? []
        : paintedPlaces
            .filter(
              (p) =>
                !!p?.id &&
                Number.isFinite(p.lat) &&
                Number.isFinite(p.lng),
            )
            .slice(0, 80),
    [hideNearbyForPlan, paintedPlaces],
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
        scrollEnabled
        zoomEnabled
        followsUserLocation={nativeFollow}
        userLocationUpdateInterval={2000}
        onMapReady={() => {
          mapReadyRef.current = true;
          setMapReady(true);
        }}
        onPress={() => {
          safeInvoke(() => {
            if (followMode !== 'free') setFollowMode('free');
          });
        }}
        onLongPress={(e: LongPressEvent) => {
          const coord = e.nativeEvent?.coordinate;
          const latitude = coord?.latitude;
          const longitude = coord?.longitude;
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
          safeInvoke(() => onLongPress?.(latitude, longitude));
        }}
        onRegionChangeComplete={(region) => {
          if (!Number.isFinite(region?.latitude) || !Number.isFinite(region?.longitude)) return;
          regionRef.current = region;
          safeInvoke(() => {
            if (Math.abs(useMapStore.getState().bearing) > 0.5) {
              setBearing(0);
            }
            onMapIdleCenter?.(region.latitude, region.longitude);
          });
        }}
        onPanDrag={() => {
          safeInvoke(() => {
            if (followMode !== 'free') setFollowMode('free');
          });
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
              safeInvoke(() => {
                e.stopPropagation?.();
                onPoiPress?.(p.id);
              });
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

        {/* Plan-day numbered stops + per-day chains. */}
        {paintedPlanChains.flatMap((chain) =>
          chain.stops.map((stop, index) => (
            <Marker
              key={`plan-stop:${stop.id}`}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              title={stop.name}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              zIndex={3}
              onPress={(e) => {
                safeInvoke(() => {
                  e.stopPropagation?.();
                  setFocusedStopId(stop.id);
                });
              }}>
              <NumberedPlanMarker
                number={index + 1}
                color={chain.color}
                textColor="#FFFFFF"
              />
            </Marker>
          )),
        )}

        {paintedPlanChains.flatMap((chain) =>
          chain.polylines.map((coords, i) =>
            coords.length > 1 ? (
              <Polyline
                key={`plan-leg:${chain.dayId}:${i}`}
                coordinates={coords}
                strokeColor={chain.color}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                zIndex={2}
              />
            ) : null,
          ),
        )}

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
