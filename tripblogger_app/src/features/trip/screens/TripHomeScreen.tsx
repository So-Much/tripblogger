import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
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
import { SearchResultsList } from '../search/SearchResultsList';
import { useRecentSearchesStore } from '../search/recent-searches.store';
import { TripBottomNav } from '../nav/TripBottomNav';
import { DirectionsSheet } from '../sheets/DirectionsSheet';
import { ExploreSheet } from '../sheets/ExploreSheet';
import { PlaceDetailSheet } from '../sheets/PlaceDetailSheet';
import { mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';
import type { MapPlace } from '../types/map';
import { haversineM } from '../utils/geo';

export function TripHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const mapRef = useRef<MapCanvasHandle>(null);
  const [reverseLoading, setReverseLoading] = useState(false);

  const { coords, granted } = useUserLocation(true);
  const followMode = useMapStore((s) => s.followMode);
  const selectedCategory = useMapStore((s) => s.selectedCategory);
  const searchCenter = useMapStore((s) => s.searchCenter);
  const setSearchCenter = useMapStore((s) => s.setSearchCenter);
  const mapCenter = useMapStore((s) => s.mapCenter);
  const setMapCenter = useMapStore((s) => s.setMapCenter);
  const showSearchThisArea = useMapStore((s) => s.showSearchThisArea);
  const setShowSearchThisArea = useMapStore((s) => s.setShowSearchThisArea);
  const openPlace = useMapStore((s) => s.openPlace);
  const setActiveSheet = useMapStore((s) => s.setActiveSheet);
  const setExploreSnapIndex = useMapStore((s) => s.setExploreSnapIndex);
  const setFollowMode = useMapStore((s) => s.setFollowMode);
  const activeSheet = useMapStore((s) => s.activeSheet);
  const searchOpen = useMapStore((s) => s.searchOpen);
  const nearbyPlaces = useMapStore((s) => s.nearbyPlaces);
  const hydrateRecent = useRecentSearchesStore((s) => s.hydrate);
  const remember = useRememberSearch();

  const effectiveCenter =
    searchCenter ??
    (coords ? { lat: coords.lat, lng: coords.lng } : null);

  const nearby = useNearbyPlaces(effectiveCenter, selectedCategory);
  const search = usePlaceSearch(coords?.lat, coords?.lng);

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
      remember(place);
      openPlace(place);
      setFollowMode('free');
      mapRef.current?.flyTo(place.lng, place.lat, 16);
    },
    [openPlace, remember, setFollowMode],
  );

  const handleLongPress = useCallback(
    async (lat: number, lng: number) => {
      setReverseLoading(true);
      try {
        const reversed = await mapService.reverse(lat, lng);
        const place: MapPlace = reversed ?? {
          id: `dropped:${lat.toFixed(5)},${lng.toFixed(5)}`,
          name: t('mapDroppedPin'),
          address: null,
          lat,
          lng,
          category: null,
          source: 'nominatim',
          distanceM: coords
            ? Math.round(haversineM(coords.lat, coords.lng, lat, lng))
            : null,
          rating: null,
        };
        handleSelectPlace(place);
      } catch {
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
        });
      } finally {
        setReverseLoading(false);
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

  return (
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

      <MapSearchBar loading={search.isFetching} />
      <CategoryChipRow loading={nearby.isFetching} />

      {showSearchThisArea && mapCenter ? (
        <Pressable
          style={[styles.searchArea, { top: insets.top + 108, backgroundColor: surface, borderColor: border }]}
          disabled={nearby.isFetching}
          onPress={() => {
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

      {reverseLoading ? (
        <View
          style={[
            styles.reversePill,
            { top: insets.top + 108, backgroundColor: surface, borderColor: border },
          ]}>
          <ActivityIndicator size="small" color={tint} />
          <Text style={{ color: text, fontSize: 13 }}>{t('mapLoadingReverse')}</Text>
        </View>
      ) : null}

      {!granted ? (
        <View style={[styles.permBanner, { top: insets.top + 108, backgroundColor: surface, borderColor: border }]}>
          <Text style={{ color: text, fontSize: 13 }}>{t('mapLocationDenied')}</Text>
        </View>
      ) : null}

      <MapControlColumn
        onRecenter={recenter}
        onResetNorth={() => mapRef.current?.resetNorth()}
      />
      <MapAttribution />

      {searchOpen && activeSheet === 'search' ? (
        <View style={[styles.searchOverlay, { paddingTop: insets.top + 120, backgroundColor: surface }]}>
          <SearchResultsList onSelect={handleSelectPlace} loading={search.isFetching} />
        </View>
      ) : null}

      <ExploreSheet onSelectPlace={handleSelectPlace} loading={nearby.isFetching} />
      <PlaceDetailSheet />
      <DirectionsSheet
        userLat={coords?.lat}
        userLng={coords?.lng}
        onFitRoute={(c) => mapRef.current?.fitRoute(c)}
      />
      <TripBottomNav
        onExplorePress={() => {
          setExploreSnapIndex(1);
          setActiveSheet('explore');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backBtn: {
    position: 'absolute',
    left: 12,
    zIndex: 25,
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
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 28,
  },
});
