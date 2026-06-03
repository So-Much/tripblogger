import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DirectionsLoadingOverlay } from '@/src/components/trips/DirectionsLoadingOverlay';
import { DirectionsPickerSheet } from '@/src/components/trips/DirectionsPickerSheet';
import { TripCustomMarkerSheet } from '@/src/components/trips/TripCustomMarkerSheet';
import { TripLocationDetailSheet } from '@/src/components/trips/TripLocationDetailSheet';
import {
  TripLocationFilterSheet,
  countTripLocationFilters,
} from '@/src/components/trips/TripLocationFilterSheet';
import { TripMapSearchBar } from '@/src/components/trips/TripMapSearchBar';
import { TripMapView, type TripMapViewHandle } from '@/src/components/trips/TripMapView';
import { TripExploreSheet } from '@/src/components/trips/TripExploreSheet';
import { TripRouteTimeline } from '@/src/components/trips/TripRouteTimeline';
import { useDirectionsLauncher } from '@/src/hooks/useDirectionsLauncher';
import { useTurnByTurnNavigation } from '@/src/hooks/useTurnByTurnNavigation';
import { useI18n } from '@/src/i18n';
import { KeyboardFormScroll } from '@/src/components/forms/KeyboardFormScroll';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTripMapExplore } from '@/src/hooks/useTripMapExplore';
import { useTripPlanner } from '@/src/hooks/useTripPlanner';
import { useTripRoutePolylines } from '@/src/hooks/useTripRoutePolylines';
import {
  useUserMapMarkersStore,
  userMarkerPinId,
} from '@/src/store/user-map-markers.store';
import { tripsService } from '@/src/services/api/trips.service';
import type { MapCheckpoint, MapExplorePin } from '@/src/types/trip-map';
import type { TripPlannerFilters } from '@/src/types/trip-planner';
import { formatApiError } from '@/src/utils/format-api-error';
import {
  pinFromCustomCoords,
  userMarkerToCheckpoint,
  userMarkerToPin,
} from '@/src/utils/user-map-marker-pin';

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pinFromCheckpoint(cp: MapCheckpoint, id = 'checkpoint'): MapExplorePin {
  return {
    id,
    name: cp.name,
    address: null,
    latitude: cp.lat,
    longitude: cp.lng,
    avgRating: 0,
    totalReview: 0,
    locationType: cp.locationType ?? { code: 'accommodation', name: 'Mốc' },
  };
}

export function TripCreateScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<TripMapViewHandle>(null);
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    name?: string;
    locationId?: string;
  }>();

  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const initialStay = useMemo<MapCheckpoint | null>(() => {
    const lat = params.lat ? Number(params.lat) : NaN;
    const lng = params.lng ? Number(params.lng) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      lat,
      lng,
      name: typeof params.name === 'string' && params.name.trim() ? params.name : 'Mốc',
      locationId: typeof params.locationId === 'string' ? params.locationId : undefined,
    };
  }, [params.lat, params.lng, params.name, params.locationId]);

  const planner = useTripPlanner(initialStay, { sharedDraft: true });
  const explore = useTripMapExplore(planner.filters);
  const navigation = useTurnByTurnNavigation();
  const directions = useDirectionsLauncher(navigation);
  const userMarkers = useUserMapMarkersStore((s) => s.markers);

  const [filterVisible, setFilterVisible] = useState(false);
  const [filterDraft, setFilterDraft] = useState<TripPlannerFilters>(planner.filters);
  const [metaVisible, setMetaVisible] = useState(false);
  const [detailPin, setDetailPin] = useState<MapExplorePin | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [customSheetVisible, setCustomSheetVisible] = useState(false);
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customMarkerId, setCustomMarkerId] = useState<string | null>(null);
  const [customMarkerSaved, setCustomMarkerSaved] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<{ lat: number; lng: number; name: string } | null>(
    null,
  );

  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState('');
  const [destinationName, setDestinationName] = useState(initialStay?.name ?? '');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 2));
  const [error, setError] = useState<string | null>(null);

  const { polylineCoords, legSummaries, directionMarkers } = useTripRoutePolylines(planner.stops);
  const TIMELINE_DOCK_HEIGHT = 200;

  const mapCenter = planner.primary
    ? { latitude: planner.primary.lat, longitude: planner.primary.lng }
    : explore.exploreCenter
      ? { latitude: explore.exploreCenter.lat, longitude: explore.exploreCenter.lng }
      : null;

  const plannerMapStops = planner.stops.map((s, i) => ({
    clientId: s.clientId,
    lat: s.lat,
    lng: s.lng,
    name: s.name,
    sequenceNumber: i + 1,
    locationType: s.locationType,
  }));

  const fitBounds = useMemo(() => {
    const coords = [
      ...planner.stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
      ...explore.nearbyResults.slice(0, 8).map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    ];
    return coords.length > 0 ? coords : undefined;
  }, [planner.stops, explore.nearbyResults]);

  const fitMapAround = useCallback(
    (cp: MapCheckpoint) => {
      const coords = [
        { latitude: cp.lat, longitude: cp.lng },
        ...explore.nearbyResults.slice(0, 6).map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })),
      ];
      mapRef.current?.fitToCoordinates(coords);
    },
    [explore.nearbyResults],
  );

  const handleSelectCheckpoint = useCallback(
    async (cp: MapCheckpoint) => {
      planner.setPrimary(cp);
      setDestinationName(cp.name);
      await explore.selectCheckpoint(cp);
      fitMapAround(cp);
    },
    [planner, explore, fitMapAround],
  );

  const openPinDetail = (pin: MapExplorePin) => {
    planner.setSelectedPinId(pin.id);
    setDetailPin(pin);
    setDetailVisible(true);
  };

  const closePinDetail = () => {
    setDetailVisible(false);
    setDetailPin(null);
  };

  const closeCustomMarkerSheet = useCallback(() => {
    setCustomSheetVisible(false);
    if (!customMarkerSaved) {
      setPendingMarker(null);
      planner.setSelectedPinId(null);
    }
    setCustomCoords(null);
    setCustomMarkerId(null);
    setCustomMarkerSaved(false);
  }, [customMarkerSaved, planner]);

  const openCustomMarkerSheet = useCallback(
    (coords: { lat: number; lng: number }, marker?: { id: string; name: string }) => {
      closePinDetail();
      setCustomCoords(coords);
      setCustomMarkerId(marker?.id ?? null);
      setCustomMarkerSaved(Boolean(marker));
      setPendingMarker(
        marker ? null : { lat: coords.lat, lng: coords.lng, name: t('tripCustomMapPoint') },
      );
      const pinId = marker
        ? userMarkerPinId(marker.id)
        : `custom:${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;
      planner.setSelectedPinId(pinId);
      setCustomSheetVisible(true);
    },
    [planner, t],
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
    planner.setSelectedPinId(userMarkerPinId(marker.id));
    void explore.selectCheckpoint(userMarkerToCheckpoint(marker));
  };

  const chainIndexForPin = (pin: MapExplorePin) => {
    const idx = planner.stops.findIndex(
      (s) => s.lat.toFixed(5) === pin.latitude.toFixed(5) && s.lng.toFixed(5) === pin.longitude.toFixed(5),
    );
    return idx >= 0 ? idx : null;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const anchor = planner.primary;
      if (!anchor) throw new Error('Chọn điểm đầu trước');
      const trip = await tripsService.create({
        title: title.trim(),
        destinationName: destinationName.trim() || anchor.name,
        startDate,
        endDate,
      });

      const isAccommodation = anchor.locationType?.code === 'accommodation';
      if (isAccommodation) {
        const accomBody = anchor.locationId
          ? {
              locationId: anchor.locationId,
              checkIn: startDate,
              checkOut: endDate,
              isPrimary: true,
            }
          : {
              customName: anchor.name,
              lat: anchor.lat,
              lng: anchor.lng,
              checkIn: startDate,
              checkOut: endDate,
              isPrimary: true,
            };
        await tripsService.addAccommodation(trip.id, accomBody);
      }

      const tripDetail = await tripsService.getById(trip.id);
      const day1 = [...(tripDetail.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber)[0];
      if (!day1) throw new Error('Không tạo được ngày cho chuyến đi');

      for (let i = 0; i < planner.stops.length; i++) {
        const stop = planner.stops[i];
        await tripsService.addStop(trip.id, day1.id, {
          ...(stop.locationId ? { locationId: stop.locationId } : {}),
          ...(!stop.locationId ? { customName: stop.name, lat: stop.lat, lng: stop.lng } : {}),
          orderIndex: i,
        });
      }

      try {
        await tripsService.refreshRecommendations(trip.id);
      } catch {
        // optional
      }
      return trip;
    },
    onSuccess: (trip) => {
      setMetaVisible(false);
      planner.clear();
      router.replace({ pathname: '/(tabs)/trips/[id]', params: { id: trip.id } });
    },
    onError: (e) => setError(formatApiError(e, 'Không tạo được chuyến đi')),
  });

  const filterCount = countTripLocationFilters(planner.filters);

  useEffect(() => {
    void useUserMapMarkersStore.getState().hydrate();
    if (initialStay) {
      void explore.selectCheckpoint(initialStay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed map once from route params
  }, []);

  return (
    <ThemedView style={styles.flex}>
      {mapCenter ? (
        <TripMapView
          ref={mapRef}
          center={mapCenter}
          checkpoint={planner.primary}
          pins={searchFocused ? [] : explore.nearbyResults}
          plannerStops={plannerMapStops}
          legDirectionMarkers={directionMarkers}
          polylineCoords={polylineCoords}
          directionPolyline={navigation.displayPolyline}
          fitBounds={fitBounds}
          followUser={navigation.active}
          dimUnselectedPins={Boolean(planner.primary && planner.selectedPinId)}
          selectedPinId={planner.selectedPinId}
          customMarkers={userMarkers}
          pendingMarker={pendingMarker}
          allowMapPress={!searchFocused}
          onMapPress={(coords) => {
            void explore.selectCheckpoint({
              lat: coords.lat,
              lng: coords.lng,
              name: t('tripCustomMapPoint'),
              locationType: { code: 'other', name: 'Tùy chọn' },
            });
            openCustomMarkerSheet(coords);
          }}
          onPinPress={openPinDetail}
          onCustomMarkerPress={(marker) =>
            openCustomMarkerSheet({ lat: marker.lat, lng: marker.lng }, marker)
          }
          onCheckpointPress={(cp) => {
            if (cp.locationId) {
              openPinDetail(pinFromCheckpoint(cp, cp.locationId));
              return;
            }
            const saved = userMarkers.find(
              (m) =>
                m.lat.toFixed(5) === cp.lat.toFixed(5) && m.lng.toFixed(5) === cp.lng.toFixed(5),
            );
            openCustomMarkerSheet({ lat: cp.lat, lng: cp.lng }, saved);
          }}
        />
      ) : (
        <View style={[styles.placeholderMap, { backgroundColor: card, borderColor: border }]}>
          <ActivityIndicator color={tint} />
          <ThemedText style={{ color: muted, marginTop: 8 }}>Đang tải bản đồ…</ThemedText>
        </View>
      )}

      <SafeAreaView edges={['top']} style={[styles.topBar, { paddingTop: insets.top > 0 ? 0 : 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <IconSymbol name="chevron.left" size={22} color={tint} />
        </Pressable>
        <View style={styles.searchWrap}>
          <TripMapSearchBar
            userLat={explore.userCoords?.lat}
            userLng={explore.userCoords?.lng}
            checkpoint={planner.primary}
            onFocusChange={setSearchFocused}
            onSelectCheckpoint={handleSelectCheckpoint}
            onClearCheckpoint={() => {
              planner.setPrimary(null);
              void explore.clearCheckpoint();
            }}
          />
        </View>
        <Pressable
          style={[styles.filterBtn, { backgroundColor: card, borderColor: border }]}
          onPress={() => {
            setFilterDraft(planner.filters);
            setFilterVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc">
          <IconSymbol name="slider.horizontal.3" size={20} color={tint} />
          {filterCount > 0 ? (
            <View style={[styles.filterBadge, { backgroundColor: cta }]}>
              <ThemedText style={{ color: onCta, fontSize: 10, fontWeight: '800' }}>{filterCount}</ThemedText>
            </View>
          ) : null}
        </Pressable>
      </SafeAreaView>

      {!searchFocused ? (
        <ThemedText style={[styles.mapTapHint, { color: muted }]}>
          {t('tripMapTapHint')}
        </ThemedText>
      ) : null}

      {!searchFocused && planner.primary ? (
        <TripExploreSheet
          pins={explore.nearbyResults}
          loading={explore.loading}
          checkpointLabel={planner.primary.name}
          selectedPinId={planner.selectedPinId}
          bottomInset={TIMELINE_DOCK_HEIGHT}
          onPinPress={openPinDetail}
        />
      ) : null}

      <View style={[styles.timelineDock, { backgroundColor: `${card}FA`, borderColor: border }]}>
        <TripRouteTimeline
          stops={planner.stops}
          legSummaries={legSummaries}
          selectedClientId={selectedStopId}
          onSelectStop={(clientId) => {
            setSelectedStopId(clientId);
            const stop = planner.stops.find((s) => s.clientId === clientId);
            if (stop) {
              mapRef.current?.fitToCoordinates([
                { latitude: stop.lat, longitude: stop.lng },
              ]);
            }
          }}
          onRemoveStop={planner.removeStop}
          onMoveUp={planner.moveStopUp}
          onMoveDown={planner.moveStopDown}
        />
        <Pressable
          style={[styles.continueBtn, { backgroundColor: cta, opacity: planner.hasPrimary ? 1 : 0.45 }]}
          disabled={!planner.hasPrimary}
          onPress={() => {
            setError(null);
            if (!title.trim()) setTitle(planner.primary?.name ? `Chuyến đi ${planner.primary.name}` : 'Chuyến đi mới');
            setMetaVisible(true);
          }}>
          <ThemedText style={{ color: onCta, fontWeight: '700' }}>{t('tripContinue')}</ThemedText>
        </Pressable>
      </View>

      <TripLocationFilterSheet
        visible={filterVisible}
        draft={filterDraft}
        onChange={setFilterDraft}
        onClose={() => setFilterVisible(false)}
        onReset={() => setFilterDraft({ sort: 'rating' })}
        onApply={() => {
          planner.setFilters(filterDraft);
          setFilterVisible(false);
        }}
      />

      <TripLocationDetailSheet
        visible={detailVisible}
        pin={detailPin}
        chainIndex={detailPin ? chainIndexForPin(detailPin) : null}
        tripDayLabel={t('locationDayDefault')}
        hasAnchor={planner.hasPrimary}
        onPinResolved={(p) => setDetailPin(p)}
        onClose={closePinDetail}
        onSetAnchor={() => {
          if (!detailPin) return;
          void handleSelectCheckpoint({
            lat: detailPin.latitude,
            lng: detailPin.longitude,
            name: detailPin.name,
            locationId: detailPin.id && /^[0-9a-f-]{36}$/i.test(detailPin.id) ? detailPin.id : undefined,
            locationType: detailPin.locationType,
          });
          closePinDetail();
        }}
        onAddToRoute={() => {
          if (!detailPin) return;
          const ok = planner.appendStop({
            id:
              detailPin.id ??
              `custom:${detailPin.latitude.toFixed(5)},${detailPin.longitude.toFixed(5)}`,
            name: detailPin.name,
            latitude: detailPin.latitude,
            longitude: detailPin.longitude,
            locationId: detailPin.id && /^[0-9a-f-]{36}$/i.test(detailPin.id) ? detailPin.id : undefined,
            locationType: detailPin.locationType,
          });
          if (ok) closePinDetail();
        }}
        onRemoveFromRoute={() => {
          if (!detailPin) return;
          const idx = chainIndexForPin(detailPin);
          if (idx != null && idx > 0) planner.removeStop(planner.stops[idx].clientId);
          closePinDetail();
        }}
        onDirections={() => {
          if (!detailPin) return;
          closePinDetail();
          directions.openPicker({
            lat: detailPin.latitude,
            lng: detailPin.longitude,
            name: detailPin.name,
          });
        }}
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
        hasAnchor={planner.hasPrimary}
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
          const ok = planner.appendStop({
            id:
              pin.id ?? `custom:${pin.latitude.toFixed(5)},${pin.longitude.toFixed(5)}`,
            name: pin.name,
            latitude: pin.latitude,
            longitude: pin.longitude,
            locationType: pin.locationType,
          });
          if (ok) closeCustomMarkerSheet();
        }}
        onDirections={() => {
          const pin = activeCustomPin();
          if (!pin) return;
          closeCustomMarkerSheet();
          directions.openPicker({
            lat: pin.latitude,
            lng: pin.longitude,
            name: pin.name,
          });
        }}
        onRemoveFromRoute={() => {
          const pin = activeCustomPin();
          if (!pin) return;
          const idx = chainIndexForPin(pin);
          if (idx != null && idx > 0) planner.removeStop(planner.stops[idx].clientId);
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

      <Modal visible={metaVisible} animationType="slide" transparent onRequestClose={() => setMetaVisible(false)}>
        <Pressable style={styles.metaBackdrop} onPress={() => setMetaVisible(false)} />
        <SafeAreaView edges={['bottom']} style={[styles.metaSheet, { backgroundColor: card, borderColor: border }]}>
          <ThemedText type="subtitle">{t('tripCreateTitle')}</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 13 }}>
            {planner.stops.length} điểm · {startDate}
          </ThemedText>
          <KeyboardFormScroll contentContainerStyle={styles.metaForm}>
            <ThemedTextInput placeholder="Tiêu đề" value={title} onChangeText={setTitle} />
            <ThemedTextInput placeholder={t('tripCreateEndDate')} value={endDate} onChangeText={setEndDate} />
            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
            <Pressable
              style={[styles.continueBtn, { backgroundColor: tint }]}
              disabled={!title.trim() || mutation.isPending}
              onPress={() => mutation.mutate()}>
              {mutation.isPending ? (
                <ActivityIndicator color={onCta} />
              ) : (
                <ThemedText style={[styles.btnText, { color: onCta }]}>{t('tripCreateSubmit')}</ThemedText>
              )}
            </Pressable>
          </KeyboardFormScroll>
        </SafeAreaView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  placeholderMap: {
    flex: 1,
    margin: 16,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    zIndex: 20,
  },
  searchWrap: { flex: 1 },
  filterBtn: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 10,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  mapTapHint: {
    position: 'absolute',
    top: 100,
    left: 12,
    right: 12,
    fontSize: 11,
    textAlign: 'center',
    zIndex: 11,
  },
  primaryBanner: {
    position: 'absolute',
    top: 108,
    left: 12,
    right: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 12,
  },
  timelineDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingBottom: 8,
    gap: 8,
  },
  continueBtn: {
    marginHorizontal: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  metaBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  metaSheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    gap: 8,
    maxHeight: '70%',
  },
  metaForm: { gap: 10, paddingBottom: 8 },
  btnText: { fontWeight: '700' },
  error: { color: '#c00' },
});
