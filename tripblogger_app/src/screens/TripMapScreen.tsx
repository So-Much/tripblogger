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
import { TripMapSearchBar, type TripMapSearchBarHandle } from '@/src/components/trips/TripMapSearchBar';
import { TripMapView } from '@/src/components/trips/TripMapView';
import { TripPinActionSheet } from '@/src/components/trips/TripPinActionSheet';
import { useActiveTripRoute } from '@/src/hooks/useActiveTripRoute';
import { useTurnByTurnNavigation } from '@/src/hooks/useTurnByTurnNavigation';
import { useTripMapExplore } from '@/src/hooks/useTripMapExplore';
import { useMeQuery } from '@/src/hooks/useAuth';
import { tripsService } from '@/src/services/api/trips.service';
import type { MapCheckpoint, MapExplorePin } from '@/src/types/trip-map';
import { formatApiError } from '@/src/utils/format-api-error';
import { buildAddStopPayload } from '@/src/utils/map-stop-payload';
import { pickTripDayForNewStop } from '@/src/utils/pick-trip-day';

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

  const isMember = meQuery.data?.role === 'MEMBER';

  const explore = useTripMapExplore();
  const activeRoute = useActiveTripRoute(isMember);
  const navigation = useTurnByTurnNavigation();

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [actionPin, setActionPin] = useState<MapExplorePin | null>(null);
  const [actionVisible, setActionVisible] = useState(false);

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
        Alert.alert('Không bắt đầu chỉ đường', formatApiError(e, 'Thử lại sau.'));
      }
    },
    [navigation],
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
    return explore.checkpoint;
  }, [activeRoute.trip?.status, activeRoute.nextStop, explore.checkpoint]);

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
      void qc.invalidateQueries({ queryKey: ['trips', 'active-or-planning'] });
      void qc.invalidateQueries({ queryKey: ['trips', 'route', trip.id] });
    });
  }, [activeRoute.trip, activeRoute.routeStops.length, activeRoute.isLoading, qc]);

  const openCreate = () => {
    const cp = explore.checkpoint;
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

  const handleMapPress = (coords: { lat: number; lng: number }) => {
    if (navigation.active) return;
    if (searchFocused) {
      searchBarRef.current?.dismiss();
      return;
    }
    navigation.stopNavigation();
    setSelectedPinId(null);
    void explore.selectCheckpoint({
      lat: coords.lat,
      lng: coords.lng,
      name: 'Vị trí đã chọn',
      locationType: { code: 'other', name: 'Vị trí tùy chọn' },
    });
  };

  const handleSelectCheckpoint = (cp: MapCheckpoint) => {
    if (navigation.active) return;
    navigation.stopNavigation();
    setSelectedPinId(null);
    void explore.selectCheckpoint(cp);
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
      Alert.alert('Đã thêm', `"${pin.name}" đã được thêm vào lịch trình.`);
    },
    onError: (e) => {
      if (e instanceof Error && e.message === 'NO_TRIP') {
        Alert.alert('Chưa có chuyến đi', 'Tạo chuyến đi mới để thêm điểm dừng này?', [
          { text: 'Huỷ', style: 'cancel' },
          {
            text: 'Tạo chuyến đi',
            onPress: () => {
              const pin = actionPin;
              closePinActions();
              if (!pin) {
                openCreate();
                return;
              }
              router.push({
                pathname: '/(tabs)/trips/create',
                params: {
                  lat: String(pin.latitude),
                  lng: String(pin.longitude),
                  name: pin.name,
                  ...(UUID_RE.test(pin.id) ? { locationId: pin.id } : {}),
                },
              });
            },
          },
        ]);
        return;
      }
      Alert.alert('Không thêm được', formatApiError(e, 'Thử lại sau.'));
    },
  });

  const handleAddToTrip = () => {
    if (!actionPin) return;
    addStopMutation.mutate(actionPin);
  };

  const handleDirections = () => {
    if (!actionPin) return;
    closePinActions();
    void beginNavigation({
      lat: actionPin.latitude,
      lng: actionPin.longitude,
      name: actionPin.name,
    });
  };

  if (!isMember) {
    return (
      <ThemedView style={styles.guest}>
        <ThemedText type="subtitle">Chuyến đi</ThemedText>
        <ThemedText style={{ color: muted }}>Đăng nhập để khám phá bản đồ và lên kế hoạch chuyến đi.</ThemedText>
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
          pins={navigation.active ? [] : explore.nearbyResults}
          routeStops={navigation.active ? [] : activeRoute.routeStops}
          polylineCoords={navigation.active ? [] : activeRoute.polylineCoords}
          upcomingPolyline={navigation.active ? [] : activeRoute.upcomingPolyline}
          directionPolyline={navigation.displayPolyline}
          selectedPinId={selectedPinId}
          allowMapPress={!searchFocused && !navigation.active}
          followUser={navigation.active}
          liveUserPosition={navigation.livePosition}
          userHeading={navigation.heading}
          onMapPress={handleMapPress}
          onPinPress={openPinActions}
          onCheckpointPress={(cp) => openPinActions(pinFromCheckpoint(cp, cp.locationId ?? 'checkpoint'))}
          onRouteStopPress={() => {
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
        <View style={styles.topRow}>
          <ThemedText type="defaultSemiBold" style={styles.screenTitle}>
            Chuyến đi
          </ThemedText>
          <Pressable
            style={[styles.createBtn, { backgroundColor: card, borderColor: border }]}
            onPress={openCreate}
            accessibilityRole="button"
            accessibilityLabel="Tạo chuyến đi">
            <IconSymbol name="plus.circle.fill" size={28} color={tint} />
          </Pressable>
        </View>
        {!navigation.active ? (
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
        ) : null}
        {explore.error ? (
          <ThemedText style={[styles.error, { color: muted }]}>{explore.error}</ThemedText>
        ) : null}
      </View>

      <TripExploreSheet
        pins={explore.nearbyResults}
        loading={explore.loading || activeRoute.isLoading}
        checkpointLabel={
          activeRoute.trip?.status === 'ACTIVE' && activeRoute.nextStop
            ? activeRoute.nextStop.name
            : (explore.checkpoint?.name ?? null)
        }
        activeTrip={activeRoute.trip}
        nextStop={activeRoute.nextStop}
        selectedPinId={selectedPinId}
        navSummary={navigation.loading ? 'Đang tính tuyến…' : navigation.summary}
        navigationActive={navigation.active}
        navigationDestName={navigation.destination?.name}
        onPinPress={openPinActions}
        onNavigateNextStop={() => {
          const stop = activeRoute.nextStop;
          if (!stop) return;
          void beginNavigation({
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

      <TripPinActionSheet
        visible={actionVisible}
        pin={actionPin}
        tripTitle={activeRoute.trip?.title ?? null}
        adding={addStopMutation.isPending}
        onClose={closePinActions}
        onAddToTrip={handleAddToTrip}
        onDirections={handleDirections}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 20,
  },
  createBtn: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
  },
  error: {
    fontSize: 12,
    paddingHorizontal: 4,
  },
});
