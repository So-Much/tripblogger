import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';
import { useI18n } from '@/src/i18n';
import { resolvePlaceCategoryVisual } from '@/src/utils/location-type-display';
import { PlaceRatingLabel } from '../components/PlaceRatingLabel';
import { useMapStore } from '../store/map.store';
import type { MapPlace } from '../types/map';
import { formatDistance } from '../utils/geo';

type Props = {
  onSelectPlace: (place: MapPlace) => void;
  loading?: boolean;
  /** Soft error after retries exhausted — not the same as a genuine empty list. */
  error?: boolean;
};

const SNAP_FRACTIONS = [0.12, 0.5, 0.92] as const;

const SPRING = { damping: 22, stiffness: 220, mass: 0.85 };

function isRenderablePlace(place: MapPlace | null | undefined): place is MapPlace {
  return (
    !!place &&
    typeof place.id === 'string' &&
    place.id.length > 0 &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng)
  );
}

/** Draggable explore panel — snap heights + drag down to dismiss (Expo Go safe). */
export function ExploreSheet({ onSelectPlace, loading, error }: Props) {
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const places = useMapStore((s) => s.nearbyPlaces);
  const category = useMapStore((s) => s.selectedCategory);
  const exploreSnapIndex = useMapStore((s) => s.exploreSnapIndex);
  const setExploreSnapIndex = useMapStore((s) => s.setExploreSnapIndex);
  const activeSheet = useMapStore((s) => s.activeSheet);
  const setActiveSheet = useMapStore((s) => s.setActiveSheet);
  const sheetEpoch = useMapStore((s) => s.sheetEpoch);

  const listData = useMemo(() => places.filter(isRenderablePlace), [places]);

  const snapHeights = useMemo(
    () => SNAP_FRACTIONS.map((f) => Math.round(windowHeight * f)),
    [windowHeight],
  );
  const maxHeight = snapHeights[2];
  const peekHeight = snapHeights[0];
  const dismissBelow = peekHeight * 0.45;

  const initialIdx = Math.max(0, Math.min(exploreSnapIndex, snapHeights.length - 1));
  const heightSv = useSharedValue(snapHeights[initialIdx]);
  const dragStart = useSharedValue(0);
  const epochSv = useSharedValue(sheetEpoch);

  useEffect(() => {
    epochSv.value = sheetEpoch;
  }, [sheetEpoch, epochSv]);

  const finishDismiss = useCallback(
    (epochAtStart: number) => {
      const state = useMapStore.getState();
      // Category chip (or another open) superseded this close animation.
      if (state.sheetEpoch !== epochAtStart) {
        const idx = Math.min(
          Math.max(state.exploreSnapIndex, 0),
          snapHeights.length - 1,
        );
        heightSv.value = withSpring(snapHeights[idx], SPRING);
        return;
      }
      void Haptics.selectionAsync();
      setExploreSnapIndex(-1);
      setActiveSheet('none');
    },
    [heightSv, setActiveSheet, setExploreSnapIndex, snapHeights],
  );

  const commitSnap = useCallback(
    (index: number) => {
      void Haptics.selectionAsync();
      setExploreSnapIndex(index);
      setActiveSheet('explore');
    },
    [setActiveSheet, setExploreSnapIndex],
  );

  useEffect(() => {
    if (activeSheet !== 'explore') return;
    if (exploreSnapIndex < 0) return;
    const idx = Math.min(exploreSnapIndex, snapHeights.length - 1);
    heightSv.value = withSpring(snapHeights[idx], SPRING);
  }, [activeSheet, exploreSnapIndex, snapHeights, heightSv]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // JS closures (snapHeights, etc.) — keep handlers on JS thread to avoid
        // worklet/RNGH crashes when Reanimated cannot auto-workletize them.
        .runOnJS(true)
        .activeOffsetY([-8, 8])
        .onBegin(() => {
          dragStart.value = heightSv.value;
        })
        .onUpdate((e) => {
          const next = dragStart.value - e.translationY;
          heightSv.value = Math.min(maxHeight, Math.max(0, next));
        })
        .onEnd((e) => {
          const h = heightSv.value;
          const vy = e.velocityY;

          if (h < dismissBelow || (vy > 900 && h < peekHeight)) {
            const epochAtStart = epochSv.value;
            heightSv.value = withSpring(0, SPRING, (finished) => {
              if (finished) runOnJS(finishDismiss)(epochAtStart);
            });
            return;
          }

          let target = snapHeights[0];
          let targetIndex = 0;
          let best = Number.POSITIVE_INFINITY;
          const projected = h - vy * 0.08;
          for (let i = 0; i < snapHeights.length; i++) {
            const d = Math.abs(snapHeights[i] - projected);
            if (d < best) {
              best = d;
              target = snapHeights[i];
              targetIndex = i;
            }
          }
          heightSv.value = withSpring(target, SPRING);
          commitSnap(targetIndex);
        }),
    [
      commitSnap,
      dismissBelow,
      dragStart,
      epochSv,
      finishDismiss,
      heightSv,
      maxHeight,
      peekHeight,
      snapHeights,
    ],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    height: heightSv.value,
  }));

  // Keep the Reanimated + FlatList tree mounted when place/directions overlays open.
  // Hard-unmounting (`return null`) on every open/close remounts GestureHandler/Reanimated
  // views and was crashing after rapid Explore ↔ place cycles.
  const visible = activeSheet === 'explore';

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.sheet,
        sheetStyle,
        {
          backgroundColor: surface,
          borderColor: border,
          paddingBottom: Math.max(insets.bottom, 8) + 56,
          opacity: visible ? 1 : 0,
        },
      ]}>
      <GestureDetector gesture={pan}>
        <Animated.View>
          <View style={styles.handleHit}>
            <View style={[styles.handle, { backgroundColor: muted }]} />
          </View>
          <View style={styles.header}>
            <Text style={[styles.title, { color: text }]}>{t('mapExploreTitle')}</Text>
            <Text style={[styles.sub, { color: muted }]}>
              {category ? t('mapExploreCategoryHint') : t('mapExploreHint')}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>

      <FlatList
        data={listData}
        extraData={`${category ?? 'none'}-${loading ? '1' : '0'}-${error ? 'e' : ''}-${listData.length}`}
        keyExtractor={(item, index) => item.id || `nearby-${index}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          // Multi-tag filter keeps previous rows while fetching — show a compact top loader.
          loading && listData.length > 0 ? (
            <View style={styles.loadingKeepRow}>
              <ActivityIndicator size="small" color={tint} />
              <Text style={[styles.loadingText, { color: muted }]}>{t('mapLoadingNearby')}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingEmpty}>
              <ActivityIndicator size="small" color={tint} />
              <Text style={[styles.loadingText, { color: muted }]}>{t('mapLoadingNearby')}</Text>
            </View>
          ) : (
            <Text style={[styles.empty, { color: muted }]}>
              {category
                ? error
                  ? t('mapNearbyError')
                  : t('mapNearbyEmpty')
                : t('mapPickCategory')}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const categoryVisual = resolvePlaceCategoryVisual(item.category);
          return (
            <Pressable
              onPress={() => onSelectPlace(item)}
              style={[styles.row, { borderBottomColor: border }]}>
              <LocationTypeIcon
                locationType={{ code: item.category ?? 'other', name: categoryVisual.label }}
                size="sm"
              />
              <View style={styles.meta}>
                <Text style={[styles.name, { color: text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.addr, { color: muted }]} numberOfLines={1}>
                  {item.address
                    ? `${categoryVisual.label} · ${item.address}`
                    : categoryVisual.label}
                </Text>
                <PlaceRatingLabel rating={item.rating} reviewCount={item.reviewCount} />
              </View>
              {item.distanceM != null ? (
                <Text style={[styles.dist, { color: muted }]}>
                  {formatDistance(item.distanceM, language)}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    zIndex: 20,
    overflow: 'hidden',
  },
  handleHit: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 2 },
  title: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 13 },
  /** Single-tag / cleared list: centered loader with space from the list top. */
  loadingEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 28,
    paddingHorizontal: 16,
  },
  /** Multi-tag keep-previous: compact loader above retained rows. */
  loadingKeepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    paddingBottom: 8,
  },
  loadingText: { fontSize: 13, fontWeight: '500' },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  meta: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600' },
  addr: { fontSize: 12 },
  dist: { fontSize: 12, fontWeight: '600' },
  empty: { padding: 24, textAlign: 'center' },
});
