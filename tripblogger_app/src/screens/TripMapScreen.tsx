import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TripExploreSheet } from '@/src/components/trips/TripExploreSheet';
import { TripMapSearchBar } from '@/src/components/trips/TripMapSearchBar';
import { TripMapView } from '@/src/components/trips/TripMapView';
import { TripPinActionSheet } from '@/src/components/trips/TripPinActionSheet';
import { useActiveTripRoute } from '@/src/hooks/useActiveTripRoute';
import { useTripMapExplore } from '@/src/hooks/useTripMapExplore';
import { useMeQuery } from '@/src/hooks/useAuth';
import { tripsService } from '@/src/services/api/trips.service';
import type { MapCheckpoint, MapExplorePin } from '@/src/types/trip-map';
import { formatApiError } from '@/src/utils/format-api-error';
import { buildAddStopPayload } from '@/src/utils/map-stop-payload';
import { openDirectionsTo } from '@/src/utils/open-directions';
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
  };
}

export function TripMapScreen() {
  const router = useRouter();
  const { navigateNext } = useLocalSearchParams<{ navigateNext?: string }>();
  const didAutoNavigateRef = useRef(false);
  const bootstrappedTripRef = useRef<string | null>(null);
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

  const activeCheckpoint = useMemo((): MapCheckpoint | null => {
    if (activeRoute.trip?.status === 'ACTIVE' && activeRoute.nextStop) {
      return {
        lat: activeRoute.nextStop.latitude,
        lng: activeRoute.nextStop.longitude,
        name: activeRoute.nextStop.name,
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
    });

    void openDirectionsTo({ lat: stop.latitude, lng: stop.longitude }, explore.userCoords);
  }, [
    navigateNext,
    activeRoute.isLoading,
    activeRoute.trip,
    activeRoute.nextStop,
    explore,
    router,
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

  const handleMapPress = (coords: { lat: number; lng: number }) => {
    setSelectedPinId(null);
    void explore.selectCheckpoint({
      lat: coords.lat,
      lng: coords.lng,
      name: 'Vị trí đã chọn',
    });
  };

  const handleSelectCheckpoint = (cp: MapCheckpoint) => {
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
    const origin = explore.userCoords ?? (explore.checkpoint ? { lat: explore.checkpoint.lat, lng: explore.checkpoint.lng } : null);
    void openDirectionsTo(
      { lat: actionPin.latitude, lng: actionPin.longitude },
      origin,
    );
    closePinActions();
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
          pins={explore.nearbyResults}
          routeStops={activeRoute.routeStops}
          polylineCoords={activeRoute.polylineCoords}
          upcomingPolyline={activeRoute.upcomingPolyline}
          selectedPinId={selectedPinId}
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
        <TripMapSearchBar
          userLat={explore.userCoords?.lat}
          userLng={explore.userCoords?.lng}
          checkpoint={explore.checkpoint}
          onSelectCheckpoint={handleSelectCheckpoint}
          onClearCheckpoint={() => {
            setSelectedPinId(null);
            void explore.clearCheckpoint();
          }}
        />
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
        onPinPress={openPinActions}
        onNavigateNextStop={() => {
          const stop = activeRoute.nextStop;
          if (!stop) return;
          void openDirectionsTo({ lat: stop.latitude, lng: stop.longitude }, explore.userCoords);
        }}
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
