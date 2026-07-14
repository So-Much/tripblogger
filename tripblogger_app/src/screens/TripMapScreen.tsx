import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TripLocationFilterSheet, countTripLocationFilters } from '@/src/components/trips/TripLocationFilterSheet';
import { TripCustomMarkerSheet } from '@/src/components/trips/TripCustomMarkerSheet';
import { DirectionsLoadingOverlay } from '@/src/components/trips/DirectionsLoadingOverlay';
import { DirectionsPickerSheet } from '@/src/components/trips/DirectionsPickerSheet';
import { TripLocationDetailSheet } from '@/src/components/trips/TripLocationDetailSheet';
import { TripMapSearchBar, type TripMapSearchBarHandle } from '@/src/components/trips/TripMapSearchBar';
import { TripMapView } from '@/src/components/trips/TripMapView';
import { TripHubSheet, type TripHubSheetMode } from '@/src/components/trips/TripHubSheet';
import { TripStopPostsSheet } from '@/src/components/trips/TripStopPostsSheet';
import { useAndroidBack } from '@/src/hooks/useAndroidBack';
import { useActiveTripRoute } from '@/src/hooks/useActiveTripRoute';
import { useArrivalWatch } from '@/src/hooks/useArrivalWatch';
import { useArrivalCheckInPrompt } from '@/src/hooks/useArrivalCheckInPrompt';
import { useDirectionsLauncher } from '@/src/hooks/useDirectionsLauncher';
import { useTurnByTurnNavigation } from '@/src/hooks/useTurnByTurnNavigation';
import { useTripRoutePolylines } from '@/src/hooks/useTripRoutePolylines';
import { useI18n } from '@/src/i18n';
import { useTripMapExplore } from '@/src/hooks/useTripMapExplore';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useActivePlan } from '@/src/hooks/useActivePlan';
import { useUserMapMarkersStore, userMarkerPinId } from '@/src/store/user-map-markers.store';
import type { MapCheckpoint, MapExplorePin, MapRouteStop } from '@/src/types/trip-map';
import type { TripPlannerFilters } from '@/src/types/trip-planner';
import { pinFromCustomCoords, userMarkerToCheckpoint, userMarkerToPin } from '@/src/utils/user-map-marker-pin';
import { locationsService } from '@/src/services/api/locations.service';

function pinFromCheckpoint(cp: MapCheckpoint, id = 'checkpoint'): MapExplorePin {
  return {
    id,
    name: cp.name,
    address: null,
    latitude: cp.lat,
    longitude: cp.lng,
    avgRating: 0,
    totalReview: 0,
    locationType: cp.locationType ?? { code: 'other', name: 'Địa điểm' },
  };
}

export function TripMapScreen() {
  const { t } = useI18n();
  const { navigateNext } = useLocalSearchParams<{ navigateNext?: string }>();
  const router = useRouter();
  const searchBarRef = useRef<TripMapSearchBarHandle>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const insets = useSafeAreaInsets();
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
  const activePlan = useActivePlan(isMember);
  const isTripActive = activePlan.plan?.status === 'ACTIVE';
  const activeRoute = useActiveTripRoute(isMember && isTripActive);
  const queryClient = useQueryClient();
  const navigation = useTurnByTurnNavigation();
  const directions = useDirectionsLauncher(navigation);
  const explore = useTripMapExplore(mapFilters, true);

  const displayRouteStops = isTripActive ? activeRoute.routeStops : activePlan.routeStops;
  const displayNextStop = isTripActive ? activeRoute.nextStop : activePlan.nextStop;
  const plannerStops = useMemo(
    () =>
      displayRouteStops.map((s, i) => ({
        clientId: s.id,
        lat: s.latitude,
        lng: s.longitude,
        name: s.name,
        sequenceNumber: i + 1,
        locationType: s.locationType,
        role: (i === 0 ? 'start' : 'stop') as 'start' | 'stop',
      })),
    [displayRouteStops],
  );
  const tripRoutePolylines = useTripRoutePolylines(plannerStops);
  const arrivalCoords = useArrivalWatch(isMember && isTripActive);

  useArrivalCheckInPrompt({
    enabled: isMember && isTripActive,
    tripId: activePlan.plan?.id,
    nextStop: displayNextStop,
    routeStops: displayRouteStops,
    userCoords: arrivalCoords,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
      if (activePlan.plan?.id) {
        void queryClient.invalidateQueries({ queryKey: ['trips', 'route', activePlan.plan.id] });
        void queryClient.invalidateQueries({ queryKey: ['trips', activePlan.plan.id] });
      }
    },
  });

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [actionPin, setActionPin] = useState<MapExplorePin | null>(null);
  const [actionVisible, setActionVisible] = useState(false);
  const [selectedRouteStop, setSelectedRouteStop] = useState<MapRouteStop | null>(null);
  const [customSheetVisible, setCustomSheetVisible] = useState(false);
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customMarkerId, setCustomMarkerId] = useState<string | null>(null);
  const [customMarkerSaved, setCustomMarkerSaved] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<{ lat: number; lng: number; name: string } | null>(
    null,
  );
  const [hubSheetMode, setHubSheetMode] = useState<TripHubSheetMode>('expanded');
  const userMarkers = useUserMapMarkersStore((s) => s.markers);
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
    const c = explore.exploreCenter;
    if (!c) return null;
    return { latitude: c.lat, longitude: c.lng };
  }, [explore.exploreCenter]);

  const suggestionCenter = useMemo(
    () => explore.checkpoint ?? explore.userCoords,
    [explore.checkpoint, explore.userCoords],
  );

  const cityHighlightsQuery = useQuery({
    queryKey: ['trip-suggest', 'city', suggestionCenter?.lat, suggestionCenter?.lng],
    queryFn: () =>
      locationsService.nearby({
        lat: suggestionCenter!.lat,
        lng: suggestionCenter!.lng,
        sort: 'rating',
        radiusKm: 12,
        limit: 24,
      }),
    enabled: Boolean(suggestionCenter),
  });
  const nearProvinceQuery = useQuery({
    queryKey: ['trip-suggest', 'near-province', suggestionCenter?.lat, suggestionCenter?.lng],
    queryFn: () =>
      locationsService.nearby({
        lat: suggestionCenter!.lat,
        lng: suggestionCenter!.lng,
        sort: 'rating',
        radiusKm: 80,
        limit: 30,
      }),
    enabled: Boolean(suggestionCenter),
  });
  const globalQuery = useQuery({
    queryKey: ['trip-suggest', 'global', suggestionCenter?.lat, suggestionCenter?.lng],
    queryFn: () =>
      locationsService.nearby({
        lat: suggestionCenter!.lat,
        lng: suggestionCenter!.lng,
        sort: 'popularity',
        radiusKm: 300,
        limit: 40,
      }),
    enabled: Boolean(suggestionCenter),
  });

  const toPin = useCallback((item: any): MapExplorePin => ({
    id: item.id,
    name: item.name,
    address: item.address ?? null,
    latitude: item.latitude,
    longitude: item.longitude,
    avgRating: item.avgRating ?? 0,
    totalReview: item.totalReview ?? 0,
    distanceKm: item.distanceKm,
    locationType: item.locationType
      ? { code: item.locationType.code, name: item.locationType.name, icon: item.locationType.icon }
      : null,
  }), []);

  const pinnedLocation = useMemo(() => {
    if (actionPin) return actionPin;
    if (explore.checkpoint) return pinFromCheckpoint(explore.checkpoint, explore.checkpoint.locationId ?? 'checkpoint');
    return null;
  }, [actionPin, explore.checkpoint]);

  const cityHighlights = useMemo(
    () => (cityHighlightsQuery.data ?? []).filter((i) => (i.distanceKm ?? 0) <= 20).map(toPin),
    [cityHighlightsQuery.data, toPin],
  );
  const nearbyProvinceHighlights = useMemo(
    () => (nearProvinceQuery.data ?? []).filter((i) => (i.distanceKm ?? 0) > 20 && (i.distanceKm ?? 0) <= 120).map(toPin),
    [nearProvinceQuery.data, toPin],
  );
  const globalHighlights = useMemo(
    () => (globalQuery.data ?? []).filter((i) => (i.distanceKm ?? 0) > 120).map(toPin),
    [globalQuery.data, toPin],
  );

  const activeCheckpoint = useMemo((): MapCheckpoint | null => {
    if (navigation.active) return null;
    return explore.checkpoint;
  }, [navigation.active, explore.checkpoint]);

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

    // Do not auto-open custom marker modal on plain map tap.
  };

  const handleSelectCheckpoint = (cp: MapCheckpoint) => {
    if (navigation.active) return;
    navigation.stopNavigation();
    setSelectedPinId(null);
    void explore.selectCheckpoint(cp);
  };

  const chainIndexForPin = (pin: MapExplorePin | null | undefined) => {
    if (!pin || !activePlan.plan) return null;
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pin.id);
    if (uuidLike) {
      const byLocation = displayRouteStops.findIndex((s) => s.locationId === pin.id);
      if (byLocation >= 0) return byLocation;
    }
    if (!Number.isFinite(pin.latitude) || !Number.isFinite(pin.longitude)) return null;
    const latKey = pin.latitude.toFixed(5);
    const lngKey = pin.longitude.toFixed(5);
    const idx = displayRouteStops.findIndex(
      (s) => s.latitude.toFixed(5) === latKey && s.longitude.toFixed(5) === lngKey,
    );
    return idx >= 0 ? idx : null;
  };

  const filterCount = countTripLocationFilters(mapFilters);

  const handleAddToTrip = (pinOverride?: MapExplorePin) => {
    if (!isMember) {
      router.push('/login');
      return;
    }
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
    activePlan.addNode.mutate({ pin });
    closePinActions();
  };

  const openDirections = useCallback(
    (dest: { lat: number; lng: number; name?: string }) => {
      directions.openPicker(dest);
    },
    [directions],
  );

  useEffect(() => {
    if (navigateNext !== '1') return;
    const stop = displayNextStop;
    if (stop) {
      openDirections({ lat: stop.latitude, lng: stop.longitude, name: stop.name });
    }
    router.setParams({ navigateNext: undefined });
  }, [navigateNext, displayNextStop, openDirections, router]);

  const handleDirections = () => {
    if (!actionPin) return;
    closePinActions();
    openDirections({
      lat: actionPin.latitude,
      lng: actionPin.longitude,
      name: actionPin.name,
    });
  };

  useAndroidBack(() => {
    if (directions.pickerVisible) {
      directions.closePicker();
      return true;
    }
    if (customSheetVisible) {
      closeCustomMarkerSheet();
      return true;
    }
    if (actionVisible) {
      closePinActions();
      return true;
    }
    if (filterVisible) {
      setFilterVisible(false);
      return true;
    }
    if (searchFocused) {
      searchBarRef.current?.dismiss();
      return true;
    }
    if (hubSheetMode !== 'collapsed') {
      setHubSheetMode('collapsed');
      return true;
    }
    return false;
  });

  return (
    <ThemedView style={styles.page}>
      {mapCenter ? (
        <TripMapView
          center={mapCenter}
          checkpoint={activeCheckpoint}
          navigationDestination={navigationDestination}
          pins={navigation.active || isTripActive ? [] : explore.nearbyResults}
          routeStops={navigation.active ? [] : displayRouteStops}
          routeStopDisplayMode={isTripActive ? 'minimal' : 'default'}
          plannerStops={
            isTripActive
              ? []
              : plannerStops.map((s) => ({
                  clientId: s.clientId,
                  lat: s.lat,
                  lng: s.lng,
                  name: s.name,
                  sequenceNumber: s.sequenceNumber,
                  locationType: s.locationType,
                }))
          }
          polylineCoords={
            isTripActive
              ? []
              : tripRoutePolylines.polylineCoords
          }
          completedPolyline={isTripActive ? activeRoute.completedPolylineRoute : []}
          upcomingPolyline={isTripActive ? activeRoute.upcomingPolylineRoute : []}
          directionPolyline={navigation.displayPolyline}
          legDirectionMarkers={isTripActive ? [] : tripRoutePolylines.directionMarkers}
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
            setSelectedRouteStop(stop);
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
                checkpoint={explore.checkpoint}
                onFocusChange={setSearchFocused}
                onSelectCheckpoint={handleSelectCheckpoint}
                onClearCheckpoint={() => {
                  setSelectedPinId(null);
                  void explore.clearCheckpoint();
                }}
              />
            </View>
            <Pressable
              style={[styles.mapActionBtn, { backgroundColor: card, borderColor: border }]}
              onPress={() => {
                setFilterDraft(mapFilters);
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
              onPress={() => {
                setSelectedPinId(null);
                searchBarRef.current?.dismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('tripCreateA11y')}>
              <IconSymbol name="location.fill" size={24} color={tint} />
            </Pressable>
          </View>
        ) : null}
        {explore.error ? (
          <ThemedText style={[styles.error, { color: muted }]}>{explore.error}</ThemedText>
        ) : null}
        {!searchFocused ? (
          <ThemedText style={[styles.mapTapHint, { color: muted }]}>{t('tripMapTapHint')}</ThemedText>
        ) : null}
      </View>

      <TripHubSheet
        plans={activePlan.plans}
        selectedTripId={activePlan.selectedTripId}
        activePlan={activePlan.plan}
        mode={hubSheetMode}
        onModeChange={setHubSheetMode}
        pinnedLocation={pinnedLocation}
        cityHighlights={cityHighlights}
        nearbyProvinceHighlights={nearbyProvinceHighlights}
        globalHighlights={globalHighlights}
        stops={displayRouteStops}
        selectedStopId={selectedRouteStop?.id ?? null}
        onSelectPlan={activePlan.setSelectedTripId}
        onCreatePlan={() => setSelectedPinId(null)}
        onSelectStop={(stop) => setSelectedRouteStop(stop)}
        onRemoveStop={(stop) => activePlan.removeStop.mutate(stop.id)}
        onReorderStops={(stops) => activePlan.reorderStops.mutate(stops)}
        legSummaries={tripRoutePolylines.legSummaries}
        onRename={(title) => {
          if (title.trim()) activePlan.renameTrip.mutate(title.trim());
        }}
        onChangeDates={(startDate, endDate) => activePlan.changeDates.mutate({ startDate, endDate })}
        onStatus={(status) => activePlan.setStatus.mutate(status)}
        onAddRecommendation={(pin) => handleAddToTrip(pin)}
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
          setMapFilters(filterDraft);
          setFilterVisible(false);
        }}
      />

      <TripLocationDetailSheet
        visible={actionVisible}
        pin={actionPin}
        chainIndex={actionPin ? chainIndexForPin(actionPin) : null}
        tripId={activePlan.plan?.id ?? null}
        tripDayLabel={activePlan.plan ? t('locationDayDefault') : null}
        hasAnchor={displayRouteStops.length > 0}
        isMember={isMember}
        onPinResolved={(p) => setActionPin(p)}
        onClose={closePinActions}
        onSetAnchor={() => {
          if (!actionPin) return;
          void handleSelectCheckpoint({ lat: actionPin.latitude, lng: actionPin.longitude, name: actionPin.name, locationType: actionPin.locationType });
          closePinActions();
        }}
        onAddToRoute={() => handleAddToTrip()}
        onRemoveFromRoute={() => {
          if (!actionPin) return;
          const idx = chainIndexForPin(actionPin);
          if (idx == null || idx < 0) return;
          const stop = displayRouteStops[idx];
          activePlan.removeStop.mutate(stop.id);
          closePinActions();
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
        hasAnchor={displayRouteStops.length > 0}
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
          void handleSelectCheckpoint({ lat: pin.latitude, lng: pin.longitude, name: pin.name, locationType: pin.locationType });
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
          const stop = displayRouteStops[idx];
          activePlan.removeStop.mutate(stop.id);
          closeCustomMarkerSheet();
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

      <TripStopPostsSheet
        visible={Boolean(selectedRouteStop)}
        tripId={activePlan.plan?.id ?? null}
        stop={selectedRouteStop}
        onClose={() => setSelectedRouteStop(null)}
        onCheckinSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['trips', 'in-progress'] });
          if (activePlan.plan?.id) {
            void queryClient.invalidateQueries({ queryKey: ['trips', 'route', activePlan.plan.id] });
            void queryClient.invalidateQueries({ queryKey: ['trips', activePlan.plan.id] });
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
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
});
