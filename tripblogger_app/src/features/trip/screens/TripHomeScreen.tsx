import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AppErrorBoundary } from '@/src/components/AppErrorBoundary';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { MapAttribution } from '../controls/MapAttribution';
import { MapControlColumn } from '../controls/MapControlColumn';
import { useNearbyPlaces } from '../hooks/useNearbyPlaces';
import { usePlaceSearch, useRememberSearch } from '../hooks/usePlaceSearch';
import { useUserLocation } from '../hooks/useUserLocation';
import { MapCanvas, type MapCanvasHandle } from '../map/MapCanvas';
import { CategoryChipRow } from '../search/CategoryChipRow';
import { MapSearchBar } from '../search/MapSearchBar';
import { SearchFocusView } from '../search/SearchFocusView';
import { useRecentSearchesStore } from '../search/recent-searches.store';
import { TripBottomNav } from '../nav/TripBottomNav';
import { shouldShowMapSearchBar } from '../plan/plan-search-chrome';
import { PlanTab } from '../plan/PlanTab';
import { DirectionsSheet } from '../sheets/DirectionsSheet';
import { ExploreSheet } from '../sheets/ExploreSheet';
import { PlaceDetailSheet } from '../sheets/PlaceDetailSheet';
import { isAbortedError, mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';
import { usePlanStore } from '../store/plan.store';
import type { MapPlace } from '../types/map';
import { haversineM } from '../utils/geo';
import { createCoalescedInvoker } from '../plan/plan-camera';

export function TripHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const mapRef = useRef<MapCanvasHandle>(null);
  /** Aborts reverse/route work from long-press when the user moves on or unmounts. */
  const reverseAbortRef = useRef<AbortController | null>(null);
  const placeSelectCoalesceRef = useRef(createCoalescedInvoker());
  const [reverseLoading, setReverseLoading] = useState(false);

  const { coords, granted } = useUserLocation(true);
  const bottomTab = useMapStore((s) => s.bottomTab);
  const followMode = useMapStore((s) => s.followMode);
  const selectedCategory = useMapStore((s) => s.selectedCategory);
  const searchCenter = useMapStore((s) => s.searchCenter);
  const setSearchCenter = useMapStore((s) => s.setSearchCenter);
  const mapCenter = useMapStore((s) => s.mapCenter);
  const setMapCenter = useMapStore((s) => s.setMapCenter);
  const showSearchThisArea = useMapStore((s) => s.showSearchThisArea);
  const setShowSearchThisArea = useMapStore((s) => s.setShowSearchThisArea);
  const openPlace = useMapStore((s) => s.openPlace);
  const setFollowMode = useMapStore((s) => s.setFollowMode);
  const nearbyPlaces = useMapStore((s) => s.nearbyPlaces);
  const hydrateRecent = useRecentSearchesStore((s) => s.hydrate);
  const remember = useRememberSearch();
  const createOverlayOpen = usePlanStore((s) => s.createOverlayOpen);

  useEffect(() => {
    return () => {
      reverseAbortRef.current?.abort();
      reverseAbortRef.current = null;
      placeSelectCoalesceRef.current.dispose();
    };
  }, []);

  // Tag change (or clear) → drop any in-flight long-press reverse; nearby is aborted via RQ.
  useEffect(() => {
    reverseAbortRef.current?.abort();
    reverseAbortRef.current = null;
    setReverseLoading(false);
  }, [selectedCategory]);

  const effectiveCenter =
    searchCenter ??
    (coords ? { lat: coords.lat, lng: coords.lng } : null);

  const nearby = useNearbyPlaces(effectiveCenter, selectedCategory);
  const searchOrigin = coords ? { lat: coords.lat, lng: coords.lng } : null;
  const searchBias = mapCenter ?? searchOrigin;
  const search = usePlaceSearch(searchOrigin, searchBias);

  useEffect(() => {
    void hydrateRecent();
  }, [hydrateRecent]);

  useEffect(() => {
    if (coords && !searchCenter) {
      setSearchCenter({ lat: coords.lat, lng: coords.lng });
    }
  }, [coords, searchCenter, setSearchCenter]);

  const onMapIdleCenter = useCallback(
    (lat: number, lng: number) => {
      setMapCenter({ lat, lng });
      if (!searchCenter || !selectedCategory) {
        setShowSearchThisArea(false);
        return;
      }
      const moved = haversineM(searchCenter.lat, searchCenter.lng, lat, lng);
      setShowSearchThisArea(moved > 600);
    },
    [searchCenter, selectedCategory, setMapCenter, setShowSearchThisArea],
  );

  const handleSelectPlace = useCallback(
    (place: MapPlace) => {
      if (!place?.id || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
      placeSelectCoalesceRef.current.run(() => {
        reverseAbortRef.current?.abort();
        reverseAbortRef.current = null;
        setReverseLoading(false);
        remember(place);
        useMapStore.getState().setSearchQuery('');
        useMapStore.getState().setSearchOpen(false);
        openPlace(place);
        setFollowMode('free');
        mapRef.current?.flyTo(place.lng, place.lat, 16);
      });
    },
    [openPlace, remember, setFollowMode],
  );

  const handleLongPress = useCallback(
    async (lat: number, lng: number) => {
      reverseAbortRef.current?.abort();
      const ac = new AbortController();
      reverseAbortRef.current = ac;
      setReverseLoading(true);
      try {
        const reversed = await mapService.reverse(
          lat,
          lng,
          coords?.lat,
          coords?.lng,
          ac.signal,
        );
        if (ac.signal.aborted) return;
        if (reversed) {
          handleSelectPlace(reversed);
          return;
        }
        let distanceM: number | null = null;
        if (coords) {
          try {
            const { routes } = await mapService.route({
              fromLat: coords.lat,
              fromLng: coords.lng,
              toLat: lat,
              toLng: lng,
              mode: 'car',
              alternatives: false,
              signal: ac.signal,
            });
            if (ac.signal.aborted) return;
            distanceM = routes[0]?.distanceM ?? null;
          } catch (err) {
            if (isAbortedError(err) || ac.signal.aborted) return;
            distanceM = null;
          }
        }
        if (ac.signal.aborted) return;
        handleSelectPlace({
          id: `dropped:${lat.toFixed(5)},${lng.toFixed(5)}`,
          name: t('mapDroppedPin'),
          address: null,
          lat,
          lng,
          category: null,
          source: 'nominatim',
          distanceM,
          rating: null,
          reviewCount: null,
          openingHours: null,
        });
      } catch (err) {
        if (isAbortedError(err) || ac.signal.aborted) return;
        handleSelectPlace({
          id: `dropped:${lat.toFixed(5)},${lng.toFixed(5)}`,
          name: t('mapDroppedPin'),
          address: null,
          lat,
          lng,
          category: null,
          source: 'nominatim',
          distanceM: null,
          rating: null,
          reviewCount: null,
          openingHours: null,
        });
      } finally {
        if (reverseAbortRef.current === ac) {
          reverseAbortRef.current = null;
          setReverseLoading(false);
        }
      }
    },
    [coords, handleSelectPlace, t],
  );

  const handlePoiPress = useCallback(
    (placeId: string) => {
      const found = nearbyPlaces.find((p) => p.id === placeId);
      if (found) handleSelectPlace(found);
    },
    [nearbyPlaces, handleSelectPlace],
  );

  const recenter = useCallback(() => {
    if (!coords) return;
    mapRef.current?.flyTo(coords.lng, coords.lat, followMode === 'follow-heading' ? 17 : 15);
  }, [coords, followMode]);

  const onFitRoute = useCallback((c: [number, number][]) => {
    mapRef.current?.fitRoute(c);
  }, []);

  const openDirectionsFromPlace = useCallback(
    (place: MapPlace) => {
      const origin =
        coords != null
          ? {
              id: 'user-location',
              name: t('mapMyLocation'),
              address: null,
              lat: coords.lat,
              lng: coords.lng,
              category: null,
              source: 'db' as const,
              distanceM: 0,
              rating: null,
              reviewCount: null,
              openingHours: null,
            }
          : null;
      useMapStore.getState().openDirectionsTo(place, origin);
    },
    [coords, t],
  );

  const [planLayerMounted, setPlanLayerMounted] = useState(false);
  const hideMapChrome = bottomTab === 'plan';
  const showSearchBar = shouldShowMapSearchBar({ bottomTab, createOverlayOpen });

  useEffect(() => {
    if (bottomTab !== 'plan' || !createOverlayOpen) return;
    const map = useMapStore.getState();
    map.setSearchOpen(false);
    if (map.activeSheet === 'search') map.setActiveSheet('none');
  }, [bottomTab, createOverlayOpen]);

  useEffect(() => {
    if (bottomTab === 'plan') setPlanLayerMounted(true);
  }, [bottomTab]);

  return (
    <AppErrorBoundary
      title={t('appRecoverTitle')}
      body={t('appRecoverBody')}
      action={t('appRecoverAction')}>
    <View style={styles.root}>
      <MapCanvas
        ref={mapRef}
        userLat={coords?.lat}
        userLng={coords?.lng}
        onMapIdleCenter={onMapIdleCenter}
        onLongPress={handleLongPress}
        onPoiPress={handlePoiPress}
      />

      <Pressable
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }}
        style={[
          styles.backBtn,
          {
            top: insets.top + 10,
            backgroundColor: surface,
            borderColor: border,
          },
        ]}
        accessibilityLabel={t('mapExit')}>
        <MaterialIcons name="arrow-back" size={22} color={text} />
      </Pressable>

      {showSearchBar ? <MapSearchBar loading={search.isFetching} /> : null}
      {!hideMapChrome ? <CategoryChipRow loading={nearby.isFetching} /> : null}

      {!hideMapChrome && showSearchThisArea && mapCenter ? (
        <Pressable
          style={[styles.searchArea, { top: insets.top + 108, backgroundColor: surface, borderColor: border }]}
          disabled={nearby.isFetching}
          onPress={() => {
            // New map area → invalidate prior POIs + any open place (abort/ignore via epoch).
            useMapStore.getState().invalidateNearbyDataset({ openExplore: true });
            setSearchCenter(mapCenter);
            setShowSearchThisArea(false);
          }}>
          {nearby.isFetching ? (
            <ActivityIndicator size="small" color={tint} />
          ) : (
            <MaterialIcons name="refresh" size={16} color={tint} />
          )}
          <Text style={[styles.searchAreaText, { color: text }]}>
            {nearby.isFetching ? t('mapLoadingNearby') : t('mapSearchThisArea')}
          </Text>
        </Pressable>
      ) : null}

      {!hideMapChrome && reverseLoading ? (
        <View
          style={[
            styles.reversePill,
            { top: insets.top + 108, backgroundColor: surface, borderColor: border },
          ]}>
          <ActivityIndicator size="small" color={tint} />
          <Text style={{ color: text, fontSize: 13 }}>{t('mapLoadingReverse')}</Text>
        </View>
      ) : null}

      {!hideMapChrome && !granted ? (
        <View style={[styles.permBanner, { top: insets.top + 108, backgroundColor: surface, borderColor: border }]}>
          <Text style={{ color: text, fontSize: 13 }}>{t('mapLocationDenied')}</Text>
        </View>
      ) : null}

      {!hideMapChrome ? (
        <MapControlColumn
          onRecenter={recenter}
          onResetNorth={() => mapRef.current?.resetNorth()}
        />
      ) : null}
      {!hideMapChrome ? <MapAttribution /> : null}

      <ExploreSheet
        onSelectPlace={handleSelectPlace}
        loading={nearby.isFetching}
        error={nearby.showError}
      />
      {planLayerMounted ? (
        <View
          pointerEvents={bottomTab === 'plan' ? 'box-none' : 'none'}
          style={[styles.planLayer, { opacity: bottomTab === 'plan' ? 1 : 0 }]}>
          <PlanTab />
        </View>
      ) : null}
      <PlaceDetailSheet onDirections={openDirectionsFromPlace} />
      <DirectionsSheet
        userLat={coords?.lat}
        userLng={coords?.lng}
        onFitRoute={onFitRoute}
      />
      <SearchFocusView
        onSelect={handleSelectPlace}
        loading={search.isFetching}
        error={search.showError}
      />
      <TripBottomNav
        onExplorePress={() => {
          useMapStore.setState((s) => ({
            exploreSnapIndex: 1,
            activeSheet: 'explore',
            sheetEpoch: s.sheetEpoch + 1,
          }));
        }}
      />
    </View>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  planLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
  },
  backBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 33,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
  searchArea: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
  searchAreaText: { fontSize: 13, fontWeight: '600' },
  reversePill: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
  permBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 18,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
