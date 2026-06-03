import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TripExploreSheet } from '@/src/components/trips/TripExploreSheet';
import {
  TripLocationFilterSheet,
  countTripLocationFilters,
} from '@/src/components/trips/TripLocationFilterSheet';
import { TripCustomMarkerSheet } from '@/src/components/trips/TripCustomMarkerSheet';
import { DirectionsLoadingOverlay } from '@/src/components/trips/DirectionsLoadingOverlay';
import { DirectionsPickerSheet } from '@/src/components/trips/DirectionsPickerSheet';
import { TripLocationDetailSheet } from '@/src/components/trips/TripLocationDetailSheet';
import { TripMapSearchBar, type TripMapSearchBarHandle } from '@/src/components/trips/TripMapSearchBar';
import { TripMapView } from '@/src/components/trips/TripMapView';
import { useActiveTripRoute } from '@/src/hooks/useActiveTripRoute';
import { useArrivalCheckInPrompt } from '@/src/hooks/useArrivalCheckInPrompt';
import { useDirectionsLauncher } from '@/src/hooks/useDirectionsLauncher';
import { useTurnByTurnNavigation } from '@/src/hooks/useTurnByTurnNavigation';
import { useArrivalWatch } from '@/src/hooks/useArrivalWatch';
import { useI18n } from '@/src/i18n';
import { useTripMapExplore } from '@/src/hooks/useTripMapExplore';
import { useTripPlanner } from '@/src/hooks/useTripPlanner';
import { useTripRoutePolylines } from '@/src/hooks/useTripRoutePolylines';
import type { TripPlannerFilters } from '@/src/types/trip-planner';
import { useMeQuery } from '@/src/hooks/useAuth';
import { tripsService } from '@/src/services/api/trips.service';
import { TripStopPostsSheet } from '@/src/components/trips/TripStopPostsSheet';
import { TripSwitcherSheet } from '@/src/components/trips/TripSwitcherSheet';
import { useTripMapStore } from '@/src/store/trip-map.store';
import {
  useUserMapMarkersStore,
  userMarkerPinId,
} from '@/src/store/user-map-markers.store';
import type { MapCheckpoint, MapExplorePin, MapRouteStop } from '@/src/types/trip-map';
import { formatApiError } from '@/src/utils/format-api-error';
import { buildAddStopPayload } from '@/src/utils/map-stop-payload';
import { pickTripDayForNewStop } from '@/src/utils/pick-trip-day';
import {
  pinFromCustomCoords,
  userMarkerToCheckpoint,
  userMarkerToPin,
} from '@/src/utils/user-map-marker-pin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pinFromCheckpoint(cp: MapCheckpoint, id = 'checkpoint'): MapExplorePin {
  return {
    id,
    name: cp.name,
    address: null,
    latitude: cp.lat,
    longitude: cp.lng,
    avgRating: 0,
    totalReview: 0,
    locationType: cp.locationType ?? { code: 'accommodation', name: 'Checkpoint' },
  };
}

export function TripMapScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { navigateNext } = useLocalSearchParams<{ navigateNext?: string }>();
  const didAutoNavigateRef = useRef(false);
  const bootstrappedTripRef = useRef<string | null>(null);
  const searchBarRef = useRef<TripMapSearchBarHandle>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const meQuery = useMeQuery();
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const isMember = meQuery.data?.role === 'MEMBER';

  const [mapFilters, setMapFilters] = useState<TripPlannerFilters>({ sort: 'rating' });
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterDraft, setFilterDraft] = useState<TripPlannerFilters>(mapFilters);

  const activeRoute = useActiveTripRoute(isMember);
  const navigation = useTurnByTurnNavigation();
  const directions = useDirectionsLauncher(navigation);
  const draftMode = isMember && !activeRoute.trip;
  const planner = useTripPlanner(null, { sharedDraft: draftMode });
  const exploreFilters = draftMode ? planner.filters : mapFilters;
  const explore = useTripMapExplore(exploreFilters);
  const arrivalCoords = useArrivalWatch(
    isMember && activeRoute.trip?.status === 'ACTIVE' && !navigation.active,
  );

  const draftPolylines = useTripRoutePolylines(draftMode ? planner.stops : []);
  const draftPlannerMapStops = useMemo(
    () =>
      planner.stops.map((s, i) => ({
        clientId: s.clientId,
        lat: s.lat,
        lng: s.lng,
        name: s.name,
        sequenceNumber: i + 1,
        locationType: s.locationType,
      })),
    [planner.stops],
  );

  useArrivalCheckInPrompt({
    enabled: isMember && activeRoute.trip?.status === 'ACTIVE' && !navigation.active,
    tripId: activeRoute.trip?.id,
    nextStop: activeRoute.nextStop,
    routeStops: activeRoute.routeStops,
    userCoords: arrivalCoords ?? explore.userCoords,
    onSuccess: () => {
      const tripId = activeRoute.trip?.id;
      if (tripId) {
        void qc.invalidateQueries({ queryKey: ['trips', 'route', tripId] });
        void qc.invalidateQueries({ queryKey: ['trips', tripId] });
      }
    },
  });

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [actionPin, setActionPin] = useState<MapExplorePin | null>(null);
  const [actionVisible, setActionVisible] = useState(false);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [stopPostsVisible, setStopPostsVisible] = useState(false);
  const [selectedRouteStop, setSelectedRouteStop] = useState<MapRouteStop | null>(null);
  const [customSheetVisible, setCustomSheetVisible] = useState(false);
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customMarkerId, setCustomMarkerId] = useState<string | null>(null);
  const [customMarkerSaved, setCustomMarkerSaved] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<{ lat: number; lng: number; name: string } | null>(
    null,
  );
  const userMarkers = useUserMapMarkersStore((s) => s.markers);
  const selectedTripId = useTripMapStore((s) => s.selectedTripId);
  const setSelectedTripId = useTripMapStore((s) => s.setSelectedTripId);

  const isActiveTrip = activeRoute.trip?.status === 'ACTIVE';

  useEffect(() => {
    void useUserMapMarkersStore.getState().hydrate();
  }, []);

  const closeCustomMarkerSheet = useCallback(() => {
    setCustomSheetVisible(false);
    if (!customMarkerSaved) {
      setPendingMarker(null);
      setSelectedPinId(null);
    }
    setCustomCoords(null);
    setCustomMarkerId(null);
    setCustomMarkerSaved(false);
  }, [customMarkerSaved]);

  const openCustomMarkerSheet = useCallback(
    (coords: { lat: number; lng: number }, marker?: { id: string; name: string }) => {
      setActionVisible(false);
      setActionPin(null);
      setCustomCoords(coords);
      setCustomMarkerId(marker?.id ?? null);
      setCustomMarkerSaved(Boolean(marker));
      setPendingMarker(
        marker ? null : { lat: coords.lat, lng: coords.lng, name: t('tripCustomMapPoint') },
      );
      if (marker) {
        setSelectedPinId(userMarkerPinId(marker.id));
      } else {
        setSelectedPinId(`custom:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`);
      }
      setCustomSheetVisible(true);
    },
    [t],
  );

  const activeCustomPin = useCallback((): MapExplorePin | null => {
    if (!customCoords) return null;
    if (customMarkerId) {
      const marker = userMarkers.find((m) => m.id === customMarkerId);
      if (marker) return userMarkerToPin(marker);
    }
    const name = pendingMarker?.name ?? t('tripCustomMapPoint');
    return pinFromCustomCoords(customCoords, name, customMarkerId ?? undefined);
  }, [customCoords, customMarkerId, pendingMarker?.name, t, userMarkers]);

  const mapCenter = useMemo(() => {
    if (activeRoute.trip?.status === 'ACTIVE' && activeRoute.nextStop) {
      return {
        latitude: activeRoute.nextStop.latitude,
        longitude: activeRoute.nextStop.longitude,
      };
    }
    const c = explore.exploreCenter;
    if (!c) return null;
    return { latitude: c.lat, longitude: c.lng };
  }, [activeRoute.trip?.status, activeRoute.nextStop, explore.exploreCenter]);

  const beginNavigation = useCallback(
    async (dest: { lat: number; lng: number; name?: string }) => {
      try {
        await navigation.startNavigation(dest);
      } catch (e) {
        Alert.alert(t('tripDirectionsFailed'), formatApiError(e, t('tripArrivalUpdateFailedHint')));
      }
    },
    [navigation, t],
  );

  const activeCheckpoint = useMemo((): MapCheckpoint | null => {
    if (navigation.active) return null;
    if (activeRoute.trip?.status === 'ACTIVE' && activeRoute.nextStop) {
      return {
        lat: activeRoute.nextStop.latitude,
        lng: activeRoute.nextStop.longitude,
        name: activeRoute.nextStop.name,
        locationType: activeRoute.nextStop.locationType,
      };
    }
    if (draftMode && planner.primary) return planner.primary;
    return explore.checkpoint;
  }, [activeRoute.trip?.status, activeRoute.nextStop, explore.checkpoint, draftMode, planner.primary]);

  useEffect(() => {
    if (navigateNext !== '1' || didAutoNavigateRef.current) return;
    if (activeRoute.isLoading || !activeRoute.trip || activeRoute.trip.status !== 'ACTIVE') return;
    const stop = activeRoute.nextStop;
    if (!stop) return;

    didAutoNavigateRef.current = true;
    router.setParams({ navigateNext: undefined } as never);

    void explore.selectCheckpoint({
      lat: stop.latitude,
      lng: stop.longitude,
      name: stop.name,
      locationType: stop.locationType,
    });

    void beginNavigation({
      lat: stop.latitude,
      lng: stop.longitude,
      name: stop.name,
    });
  }, [
    navigateNext,
    activeRoute.isLoading,
    activeRoute.trip,
    activeRoute.nextStop,
    explore,
    router,
    beginNavigation,
  ]);

  useEffect(() => {
    const trip = activeRoute.trip;
    if (!trip || trip.status !== 'ACTIVE' || activeRoute.isLoading) return;
    if (activeRoute.routeStops.length > 0) return;
    if (bootstrappedTripRef.current === trip.id) return;
    bootstrappedTripRef.current = trip.id;
    void tripsService.bootstrapItinerary(trip.id).then(() => {
      void qc.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
      void qc.invalidateQueries({ queryKey: ['trips', 'route', trip.id] });
    });
  }, [activeRoute.trip, activeRoute.routeStops.length, activeRoute.isLoading, qc]);

  const openCreate = () => {
    if (draftMode && planner.hasPrimary) {
      router.push('/(tabs)/trips/create');
      return;
    }
    const cp = draftMode && planner.primary ? planner.primary : explore.checkpoint;
    if (cp) {
      router.push({
        pathname: '/(tabs)/trips/create',
        params: {
          lat: String(cp.lat),
          lng: String(cp.lng),
          name: cp.name,
          ...(cp.locationId ? { locationId: cp.locationId } : {}),
        },
      });
      return;
    }
    router.push('/(tabs)/trips/create');
  };

  const openPinActions = (pin: MapExplorePin) => {
    setSelectedPinId(pin.id);
    setActionPin(pin);
    setActionVisible(true);
  };

  const closePinActions = () => {
    setActionVisible(false);
    setActionPin(null);
  };

  const navigationDestination = useMemo((): MapCheckpoint | null => {
    if (!navigation.active || !navigation.destination) return null;
    const d = navigation.destination;
    return {
      lat: d.lat,
      lng: d.lng,
      name: d.name ?? 'Đích đến',
      locationType: { code: 'attraction', name: 'Đích đến' },
    };
  }, [navigation.active, navigation.destination]);

  const handleCustomMarkerSave = (name: string) => {
    if (!customCoords) return;
    const marker = useUserMapMarkersStore.getState().upsert({
      id: customMarkerId ?? undefined,
      lat: customCoords.lat,
      lng: customCoords.lng,
      name,
    });
    setCustomMarkerId(marker.id);
    setCustomMarkerSaved(true);
    setPendingMarker(null);
    setSelectedPinId(userMarkerPinId(marker.id));
    void explore.selectCheckpoint(userMarkerToCheckpoint(marker));
  };

  const handleMapPress = (coords: { lat: number; lng: number }) => {
    if (navigation.active) return;
    if (searchFocused) {
      searchBarRef.current?.dismiss();
      return;
    }
    navigation.stopNavigation();
    void explore.selectCheckpoint({
      lat: coords.lat,
      lng: coords.lng,
      name: t('tripCustomMapPoint'),
      locationType: { code: 'other', name: 'Tùy chọn' },
    });

    if (isActiveTrip) return;

    openCustomMarkerSheet(coords);
  };

  const handleSelectCheckpoint = (cp: MapCheckpoint) => {
    if (navigation.active) return;
    navigation.stopNavigation();
    setSelectedPinId(null);
    void explore.selectCheckpoint(cp);
    if (draftMode) planner.setPrimary(cp);
  };

  const chainIndexForPin = (pin: MapExplorePin | null | undefined) => {
    if (!pin || !Number.isFinite(pin.latitude) || !Number.isFinite(pin.longitude)) return null;
    const latKey = pin.latitude.toFixed(5);
    const lngKey = pin.longitude.toFixed(5);
    if (activeRoute.trip) {
      const idx = activeRoute.routeStops.findIndex(
        (s) => s.latitude.toFixed(5) === latKey && s.longitude.toFixed(5) === lngKey,
      );
      if (idx >= 0) return idx;
    }
    if (draftMode) {
      const idx = planner.stops.findIndex(
        (s) => s.lat.toFixed(5) === latKey && s.lng.toFixed(5) === lngKey,
      );
      return idx >= 0 ? idx : null;
    }
    return null;
  };

  const filterCount = countTripLocationFilters(exploreFilters);

  const continuePlanning = () => {
    router.push('/(tabs)/trips/create');
  };

  const addStopMutation = useMutation({
    mutationFn: async (pin: MapExplorePin) => {
      const trip = activeRoute.trip;
      if (!trip) throw new Error('NO_TRIP');
      const day = pickTripDayForNewStop(trip);
      if (!day) throw new Error('NO_DAY');
      return tripsService.addStop(trip.id, day.id, buildAddStopPayload(pin));
    },
    onSuccess: (_stop, pin) => {
      const tripId = activeRoute.trip?.id;
      if (tripId) {
        void qc.invalidateQueries({ queryKey: ['trips', 'route', tripId] });
        void qc.invalidateQueries({ queryKey: ['trips', tripId] });
      }
      closePinActions();
      Alert.alert(t('tripAddedStop'), t('tripAddedStopBody', { name: pin.name }));
    },
    onError: (e) => {
      if (e instanceof Error && e.message === 'NO_TRIP') {
        const pin = actionPin;
        closePinActions();
        if (
          pin &&
          draftMode &&
          Number.isFinite(pin.latitude) &&
          Number.isFinite(pin.longitude)
        ) {
          if (!planner.hasPrimary) {
            void handleSelectCheckpoint({
              lat: pin.latitude,
              lng: pin.longitude,
              name: pin.name,
              locationId: pin.id && UUID_RE.test(pin.id) ? pin.id : undefined,
              locationType: pin.locationType,
            });
          } else {
            planner.appendStop({
              id:
                pin.id ??
                `custom:${pin.latitude.toFixed(5)},${pin.longitude.toFixed(5)}`,
              name: pin.name,
              latitude: pin.latitude,
              longitude: pin.longitude,
              locationId: pin.id && UUID_RE.test(pin.id) ? pin.id : undefined,
              locationType: pin.locationType,
            });
          }
          return;
        }
        Alert.alert(t('tripNoTripTitle'), t('tripNoTripBody'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('tripCreateTrip'), onPress: openCreate },
        ]);
        return;
      }
      Alert.alert('Không thêm được', formatApiError(e, 'Thử lại sau.'));
    },
  });

  const handleAddToTrip = (pinOverride?: MapExplorePin) => {
    const pin =
      pinOverride &&
      Number.isFinite(pinOverride.latitude) &&
      Number.isFinite(pinOverride.longitude)
        ? pinOverride
        : actionPin;
    if (!pin) return;
    if (!Number.isFinite(pin.latitude) || !Number.isFinite(pin.longitude)) {
      Alert.alert(t('locationErrorTitle'), t('locationErrorGeneric'));
      return;
    }
    if (draftMode && !activeRoute.trip) {
      if (!planner.hasPrimary) {
        void handleSelectCheckpoint({
          lat: pin.latitude,
          lng: pin.longitude,
          name: pin.name,
          locationId: pin.id && UUID_RE.test(pin.id) ? pin.id : undefined,
          locationType: pin.locationType,
        });
      } else {
        planner.appendStop({
          id:
            pin.id ?? `custom:${pin.latitude.toFixed(5)},${pin.longitude.toFixed(5)}`,
          name: pin.name,
          latitude: pin.latitude,
          longitude: pin.longitude,
          locationId: pin.id && UUID_RE.test(pin.id) ? pin.id : undefined,
          locationType: pin.locationType,
        });
      }
      closePinActions();
      return;
    }
    addStopMutation.mutate(pin);
  };

  const openDirections = (dest: { lat: number; lng: number; name?: string }) => {
    directions.openPicker(dest);
  };

  const handleDirections = () => {
    if (!actionPin) return;
    closePinActions();
    openDirections({
      lat: actionPin.latitude,
      lng: actionPin.longitude,
      name: actionPin.name,
    });
  };

  if (!isMember) {
    return (
      <ThemedView style={styles.guest}>
        <ThemedText type="subtitle">Chuyến đi</ThemedText>
        <ThemedText style={{ color: muted }}>{t('tripMapGuestHint')}</ThemedText>
        <Pressable style={[styles.loginBtn, { backgroundColor: tint }]} onPress={() => router.push('/login')}>
          <ThemedText style={styles.loginText}>Đăng nhập</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.page}>
      {mapCenter ? (
        <TripMapView
          center={mapCenter}
          checkpoint={activeCheckpoint}
          navigationDestination={navigationDestination}
          pins={navigation.active || isActiveTrip ? [] : explore.nearbyResults}
          routeStops={navigation.active || draftMode ? [] : activeRoute.routeStops}
          routeStopDisplayMode={isActiveTrip ? 'minimal' : 'default'}
          completedPolyline={isActiveTrip && !navigation.active ? activeRoute.completedPolyline : []}
          plannerStops={draftMode && !navigation.active ? draftPlannerMapStops : undefined}
          legDirectionMarkers={
            draftMode && !navigation.active ? draftPolylines.directionMarkers : undefined
          }
          polylineCoords={
            navigation.active || isActiveTrip
              ? []
              : draftMode
                ? draftPolylines.polylineCoords
                : activeRoute.polylineCoords
          }
          upcomingPolyline={navigation.active ? [] : activeRoute.upcomingPolyline}
          directionPolyline={navigation.displayPolyline}
          selectedPinId={selectedPinId}
          customMarkers={userMarkers}
          pendingMarker={pendingMarker}
          allowMapPress={!searchFocused && !navigation.active}
          followUser={navigation.active}
          liveUserPosition={navigation.livePosition}
          userHeading={navigation.heading}
          onMapPress={handleMapPress}
          onPinPress={openPinActions}
          onCustomMarkerPress={(marker) =>
            openCustomMarkerSheet({ lat: marker.lat, lng: marker.lng }, marker)
          }
          onCheckpointPress={(cp) => openPinActions(pinFromCheckpoint(cp, cp.locationId ?? 'checkpoint'))}
          onRouteStopPress={(stop) => {
            if (isActiveTrip) {
              setSelectedRouteStop(stop);
              setStopPostsVisible(true);
              return;
            }
            if (activeRoute.trip) {
              router.push({ pathname: '/(tabs)/trips/[id]', params: { id: activeRoute.trip.id } });
            }
          }}
        />
      ) : (
        <View style={styles.loadingMap}>
          <ActivityIndicator color={tint} size="large" />
        </View>
      )}

      {searchFocused ? (
        <Pressable
          style={styles.searchDismissLayer}
          onPress={() => searchBarRef.current?.dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Đóng tìm kiếm"
        />
      ) : null}

      <View style={[styles.topOverlay, { paddingTop: insets.top + 8, paddingHorizontal: 12 }]}>
        {!navigation.active ? (
          <View style={styles.searchRow}>
            <View style={styles.searchFlex}>
              <TripMapSearchBar
                ref={searchBarRef}
                userLat={explore.userCoords?.lat}
                userLng={explore.userCoords?.lng}
                checkpoint={draftMode && planner.primary ? planner.primary : explore.checkpoint}
                onFocusChange={setSearchFocused}
                onSelectCheckpoint={handleSelectCheckpoint}
                onClearCheckpoint={() => {
                  setSelectedPinId(null);
                  if (draftMode) planner.setPrimary(null);
                  void explore.clearCheckpoint();
                }}
              />
            </View>
            <Pressable
              style={[styles.mapActionBtn, { backgroundColor: card, borderColor: border }]}
              onPress={() => {
                setFilterDraft(exploreFilters);
                setFilterVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('tripFilterA11y')}>
              <IconSymbol name="slider.horizontal.3" size={20} color={tint} />
              {filterCount > 0 ? (
                <View style={[styles.filterBadge, { backgroundColor: cta }]}>
                  <ThemedText style={{ color: onCta, fontSize: 9, fontWeight: '800' }}>
                    {filterCount}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              style={[styles.mapActionBtn, { backgroundColor: card, borderColor: border }]}
              onPress={openCreate}
              accessibilityRole="button"
              accessibilityLabel={t('tripCreateA11y')}>
              <IconSymbol name="plus.circle.fill" size={24} color={tint} />
            </Pressable>
          </View>
        ) : null}
        {explore.error ? (
          <ThemedText style={[styles.error, { color: muted }]}>{explore.error}</ThemedText>
        ) : null}
        {!isActiveTrip && !searchFocused ? (
          <ThemedText style={[styles.mapTapHint, { color: muted }]}>{t('tripMapTapHint')}</ThemedText>
        ) : null}
      </View>

      {draftMode && planner.stopCount > 0 ? (
        <Pressable
          style={[styles.draftBanner, { backgroundColor: cta, borderColor: border }]}
          onPress={continuePlanning}>
          <ThemedText type="defaultSemiBold" style={{ color: onCta, flex: 1 }}>
            {t('tripContinuePlanningCount', { count: planner.stopCount })}
          </ThemedText>
          <IconSymbol name="chevron.right" size={14} color={onCta} />
        </Pressable>
      ) : null}

      {activeRoute.inProgress.showFab && !navigation.active ? (
        <Pressable
          style={[styles.tripFab, { backgroundColor: cta, borderColor: border }]}
          onPress={() => setSwitcherVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('tripSwitcherTitle')}>
          <IconSymbol name="map.fill" size={22} color={onCta} />
        </Pressable>
      ) : null}

      <TripExploreSheet
        pins={isActiveTrip ? [] : explore.nearbyResults}
        loading={explore.loading || activeRoute.isLoading}
        minimalActive={isActiveTrip}
        visitedCount={activeRoute.visitedCount}
        bottomInset={draftMode && planner.stopCount > 0 ? 44 : 0}
        checkpointLabel={
          activeRoute.trip?.status === 'ACTIVE' && activeRoute.nextStop
            ? activeRoute.nextStop.name
            : (planner.primary?.name ?? explore.checkpoint?.name ?? null)
        }
        activeTrip={activeRoute.trip}
        routeStops={activeRoute.routeStops}
        nextStop={activeRoute.nextStop}
        selectedPinId={selectedPinId}
        navSummary={navigation.loading ? 'Đang tính tuyến…' : navigation.summary}
        navigationActive={navigation.active}
        navigationDestName={navigation.destination?.name}
        onPinPress={openPinActions}
        onNavigateNextStop={() => {
          const stop = activeRoute.nextStop;
          if (!stop) return;
          openDirections({
            lat: stop.latitude,
            lng: stop.longitude,
            name: stop.name,
          });
        }}
        onStopNavigation={navigation.stopNavigation}
        onTripPress={() => {
          if (activeRoute.trip) {
            router.push({ pathname: '/(tabs)/trips/[id]', params: { id: activeRoute.trip.id } });
          }
        }}
      />

      <TripLocationFilterSheet
        visible={filterVisible}
        draft={filterDraft}
        onChange={setFilterDraft}
        onClose={() => setFilterVisible(false)}
        onReset={() => {
          const reset = { sort: 'rating' as const };
          setFilterDraft(reset);
        }}
        onApply={() => {
          if (draftMode) planner.setFilters(filterDraft);
          else setMapFilters(filterDraft);
          setFilterVisible(false);
        }}
      />

      <TripLocationDetailSheet
        visible={actionVisible}
        pin={actionPin}
        chainIndex={actionPin ? chainIndexForPin(actionPin) : null}
        tripId={activeRoute.trip?.id ?? null}
        tripDayLabel={activeRoute.trip ? t('locationDayDefault') : null}
        hasAnchor={
          draftMode
            ? planner.hasPrimary
            : activeRoute.trip
              ? activeRoute.routeStops.length > 0
              : false
        }
        onPinResolved={(p) => setActionPin(p)}
        onClose={closePinActions}
        onSetAnchor={() => {
          if (!actionPin) return;
          void handleSelectCheckpoint({
            lat: actionPin.latitude,
            lng: actionPin.longitude,
            name: actionPin.name,
            locationId: actionPin.id && UUID_RE.test(actionPin.id) ? actionPin.id : undefined,
            locationType: actionPin.locationType,
          });
          closePinActions();
        }}
        onAddToRoute={() => handleAddToTrip()}
        onRemoveFromRoute={() => {
          if (!actionPin) return;
          const idx = chainIndexForPin(actionPin);
          if (idx == null || idx < 0) return;
          if (draftMode && !activeRoute.trip) {
            planner.removeStop(planner.stops[idx].clientId);
            closePinActions();
            return;
          }
          if (!activeRoute.trip) return;
          const stop = activeRoute.routeStops[idx];
          void tripsService.deleteStop(activeRoute.trip.id, stop.id).then(() => {
            void qc.invalidateQueries({ queryKey: ['trips', 'route', activeRoute.trip!.id] });
            closePinActions();
          });
        }}
        onDirections={handleDirections}
      />

      <TripCustomMarkerSheet
        visible={customSheetVisible}
        coords={customCoords}
        initialName={
          customMarkerId
            ? (userMarkers.find((m) => m.id === customMarkerId)?.name ?? t('tripCustomMapPoint'))
            : (pendingMarker?.name ?? t('tripCustomMapPoint'))
        }
        markerSaved={customMarkerSaved}
        hasAnchor={
          draftMode
            ? planner.hasPrimary
            : activeRoute.trip
              ? activeRoute.routeStops.length > 0
              : false
        }
        inRoute={(() => {
          const pin = activeCustomPin();
          if (!pin) return false;
          const idx = chainIndexForPin(pin);
          return idx != null && idx >= 0;
        })()}
        isStart={(() => {
          const pin = activeCustomPin();
          if (!pin) return false;
          return chainIndexForPin(pin) === 0;
        })()}
        onClose={closeCustomMarkerSheet}
        onSave={handleCustomMarkerSave}
        onSetAnchor={() => {
          const pin = activeCustomPin();
          if (!pin) return;
          void handleSelectCheckpoint({
            lat: pin.latitude,
            lng: pin.longitude,
            name: pin.name,
            locationType: pin.locationType,
          });
          closeCustomMarkerSheet();
        }}
        onAddToRoute={() => {
          const pin = activeCustomPin();
          if (!pin) return;
          handleAddToTrip(pin);
          closeCustomMarkerSheet();
        }}
        onDirections={() => {
          const pin = activeCustomPin();
          if (!pin) return;
          closeCustomMarkerSheet();
          openDirections({
            lat: pin.latitude,
            lng: pin.longitude,
            name: pin.name,
          });
        }}
        onRemoveFromRoute={() => {
          const pin = activeCustomPin();
          if (!pin) return;
          const idx = chainIndexForPin(pin);
          if (idx == null || idx < 0) return;
          if (draftMode && !activeRoute.trip) {
            planner.removeStop(planner.stops[idx].clientId);
            closeCustomMarkerSheet();
            return;
          }
          if (!activeRoute.trip) return;
          const stop = activeRoute.routeStops[idx];
          void tripsService.deleteStop(activeRoute.trip.id, stop.id).then(() => {
            void qc.invalidateQueries({ queryKey: ['trips', 'route', activeRoute.trip!.id] });
            closeCustomMarkerSheet();
          });
        }}
      />

      <DirectionsPickerSheet
        visible={directions.pickerVisible}
        destName={directions.pendingDest?.name}
        showAppleMaps={directions.showAppleMaps}
        onClose={directions.closePicker}
        onInApp={() => void directions.launchInApp()}
        onGoogle={() => void directions.launchGoogle()}
        onApple={() => void directions.launchApple()}
      />
      <DirectionsLoadingOverlay visible={directions.isRouting} />

      <TripSwitcherSheet
        visible={switcherVisible}
        summaries={activeRoute.inProgress.summaries}
        selectedTripId={selectedTripId ?? activeRoute.trip?.id ?? null}
        onClose={() => setSwitcherVisible(false)}
        onSelect={(id) => {
          setSelectedTripId(id);
          void qc.invalidateQueries({ queryKey: ['trips', 'route', id] });
        }}
      />

      <TripStopPostsSheet
        visible={stopPostsVisible}
        tripId={activeRoute.trip?.id ?? null}
        stop={selectedRouteStop}
        onClose={() => {
          setStopPostsVisible(false);
          setSelectedRouteStop(null);
        }}
        onCheckinSuccess={() => {
          const tripId = activeRoute.trip?.id;
          if (tripId) {
            void qc.invalidateQueries({ queryKey: ['trips', 'route', tripId] });
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  guest: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: 'center',
  },
  loginBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 8,
  },
  loginText: { color: '#fff', fontWeight: '600' },
  loadingMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  searchFlex: {
    flex: 1,
    minWidth: 0,
  },
  mapActionBtn: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  error: {
    fontSize: 12,
    paddingHorizontal: 4,
  },
  mapTapHint: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  tripFab: {
    position: 'absolute',
    right: 16,
    bottom: '28%',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
    elevation: 4,
  },
  draftBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: '36%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 9,
  },
});
