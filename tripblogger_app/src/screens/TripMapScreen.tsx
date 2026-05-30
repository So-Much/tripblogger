import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TripExploreSheet } from '@/src/components/trips/TripExploreSheet';
import { TripMapSearchBar } from '@/src/components/trips/TripMapSearchBar';
import { TripMapView } from '@/src/components/trips/TripMapView';
import { useActiveTripRoute } from '@/src/hooks/useActiveTripRoute';
import { useTripMapExplore } from '@/src/hooks/useTripMapExplore';
import { useMeQuery } from '@/src/hooks/useAuth';
import type { MapExplorePin } from '@/src/types/trip-map';

export function TripMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const meQuery = useMeQuery();
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');

  const isMember = meQuery.data?.role === 'MEMBER';

  const explore = useTripMapExplore();
  const activeRoute = useActiveTripRoute(isMember);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const mapCenter = useMemo(() => {
    const c = explore.exploreCenter;
    if (!c) return null;
    return { latitude: c.lat, longitude: c.lng };
  }, [explore.exploreCenter]);

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

  const handleMapPress = (coords: { lat: number; lng: number }) => {
    void explore.selectCheckpoint({
      lat: coords.lat,
      lng: coords.lng,
      name: 'Vị trí đã chọn',
    });
  };

  const handlePinPress = (pin: MapExplorePin) => {
    setSelectedPinId(pin.id);
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
          checkpoint={explore.checkpoint}
          pins={explore.nearbyResults}
          routeStops={activeRoute.routeStops}
          polylineCoords={activeRoute.polylineCoords}
          upcomingPolyline={activeRoute.upcomingPolyline}
          selectedPinId={selectedPinId}
          onMapPress={handleMapPress}
          onPinPress={handlePinPress}
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
          onSelectCheckpoint={(cp) => void explore.selectCheckpoint(cp)}
          onClearCheckpoint={() => void explore.clearCheckpoint()}
        />
        {explore.error ? (
          <ThemedText style={[styles.error, { color: muted }]}>{explore.error}</ThemedText>
        ) : null}
      </View>

      <TripExploreSheet
        pins={explore.nearbyResults}
        loading={explore.loading || activeRoute.isLoading}
        checkpointLabel={explore.checkpoint?.name ?? null}
        activeTrip={activeRoute.trip}
        nextStop={activeRoute.nextStop}
        onPinPress={handlePinPress}
        onTripPress={() => {
          if (activeRoute.trip) {
            router.push({ pathname: '/(tabs)/trips/[id]', params: { id: activeRoute.trip.id } });
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
