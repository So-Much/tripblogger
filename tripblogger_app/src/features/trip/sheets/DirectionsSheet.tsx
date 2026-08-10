import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useDirections } from '../hooks/useDirections';
import { useMapStore } from '../store/map.store';
import type { MapPlace, TravelMode } from '../types/map';
import { decodePolyline6, formatDistance, formatDuration } from '../utils/geo';

type Props = {
  userLat?: number;
  userLng?: number;
  onFitRoute: (coords: [number, number][]) => void;
};

const MODES: { id: TravelMode; icon: keyof typeof MaterialIcons.glyphMap; labelKey: string }[] = [
  { id: 'car', icon: 'directions-car', labelKey: 'mapModeCar' },
  { id: 'bike', icon: 'two-wheeler', labelKey: 'mapModeBike' },
  { id: 'foot', icon: 'directions-walk', labelKey: 'mapModeWalk' },
];

function buildUserOrigin(lat: number, lng: number, name: string): MapPlace {
  return {
    id: 'user-location',
    name,
    address: null,
    lat,
    lng,
    category: null,
    source: 'db',
    distanceM: 0,
    rating: null,
    reviewCount: null,
    openingHours: null,
  };
}

export function DirectionsSheet({ userLat, userLng, onFitRoute }: Props) {
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const onCta = useThemeColor({}, 'onCta');
  const border = useThemeColor({}, 'border');
  const [stepsOpen, setStepsOpen] = useState(false);

  const activeSheet = useMapStore((s) => s.activeSheet);
  const destination = useMapStore((s) => s.directionsDestination);
  const origin = useMapStore((s) => s.directionsOrigin);
  const setOrigin = useMapStore((s) => s.setDirectionsOrigin);
  const mode = useMapStore((s) => s.travelMode);
  const setMode = useMapStore((s) => s.setTravelMode);
  const routeResult = useMapStore((s) => s.routeResult);
  const selectedRouteIndex = useMapStore((s) => s.selectedRouteIndex);
  const setSelectedRouteIndex = useMapStore((s) => s.setSelectedRouteIndex);
  const closeDirections = useMapStore((s) => s.closeDirections);

  const query = useDirections();
  const fittedGeometryRef = useRef<string | null>(null);
  const onFitRouteRef = useRef(onFitRoute);
  onFitRouteRef.current = onFitRoute;

  // Prefer layout effect so origin exists before paint / query enable when possible.
  useLayoutEffect(() => {
    if (activeSheet !== 'directions') return;
    if (origin) return;
    if (userLat == null || userLng == null) return;
    setOrigin(buildUserOrigin(userLat, userLng, t('mapMyLocation')));
  }, [activeSheet, origin, userLat, userLng, setOrigin, t]);

  const route = routeResult?.routes[selectedRouteIndex];
  const routeGeometry = route?.geometry ?? null;
  const coords = useMemo(
    () => (routeGeometry ? decodePolyline6(routeGeometry) : []),
    [routeGeometry],
  );

  // Fit once per geometry — do NOT re-fit when parent re-creates onFitRoute
  // (that caused a fit ↔ onRegionChangeComplete ↔ re-render death spiral).
  useEffect(() => {
    if (activeSheet !== 'directions') {
      fittedGeometryRef.current = null;
      return;
    }
    if (!routeGeometry || coords.length < 2) return;
    if (fittedGeometryRef.current === routeGeometry) return;
    fittedGeometryRef.current = routeGeometry;
    const frame = requestAnimationFrame(() => {
      // Bail if user closed while waiting for the frame.
      if (useMapStore.getState().activeSheet !== 'directions') return;
      onFitRouteRef.current(coords);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeSheet, routeGeometry, coords]);

  if (activeSheet !== 'directions' || !destination) return null;

  const awaitingOrigin = !origin;
  const showLoading = awaitingOrigin || query.isFetching;
  const showRoute = !showLoading && !!route;

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: surface,
          paddingBottom: Math.max(insets.bottom, 12) + 64,
          borderColor: border,
        },
      ]}>
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: text }]}>{t('mapDirections')}</Text>
        <Pressable
          onPress={() => {
            fittedGeometryRef.current = null;
            closeDirections();
          }}
          hitSlop={10}>
          <MaterialIcons name="close" size={22} color={muted} />
        </Pressable>
      </View>

      <Text style={[styles.endpoint, { color: muted }]} numberOfLines={1}>
        {origin?.name ?? t('mapMyLocation')} → {destination.name}
      </Text>

      <View style={styles.modes}>
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => setMode(m.id)}
              style={[
                styles.modeChip,
                {
                  backgroundColor: active ? tint : surface,
                  borderColor: active ? tint : border,
                },
              ]}>
              <MaterialIcons name={m.icon} size={18} color={active ? onCta : text} />
              <Text style={{ color: active ? onCta : text, fontWeight: '600', fontSize: 13 }}>
                {t(m.labelKey as 'mapModeCar')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={tint} />
          <Text style={{ color: muted, fontSize: 13 }}>{t('mapLoadingRoute')}</Text>
        </View>
      ) : showRoute ? (
        <>
          <View style={styles.summaryRow}>
            <Text style={[styles.summary, { color: text }]}>
              {formatDuration(route.durationS, language)} · {formatDistance(route.distanceM, language)}
            </Text>
          </View>
          {(routeResult?.routes.length ?? 0) > 1 ? (
            <View style={styles.alts}>
              {routeResult!.routes.map((r, i) => (
                <Pressable
                  key={i}
                  onPress={() => setSelectedRouteIndex(i)}
                  style={[
                    styles.altChip,
                    {
                      borderColor: i === selectedRouteIndex ? tint : border,
                      backgroundColor: i === selectedRouteIndex ? tint : surface,
                    },
                  ]}>
                  <Text
                    style={{
                      color: i === selectedRouteIndex ? onCta : text,
                      fontSize: 12,
                      fontWeight: '600',
                    }}>
                    {formatDuration(r.durationS, language)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable onPress={() => setStepsOpen((v) => !v)}>
            <Text style={{ color: tint, fontWeight: '600' }}>
              {stepsOpen ? t('mapHideSteps') : t('mapShowSteps')}
            </Text>
          </Pressable>
          {stepsOpen ? (
            <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
              {(route.steps ?? []).map((step, i) => (
                <Text key={i} style={{ color: text, fontSize: 13 }}>
                  {step.instruction}
                  {step.distanceM > 0
                    ? ` · ${formatDistance(step.distanceM, language)}`
                    : ''}
                </Text>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : (
        <Text style={{ color: muted, marginTop: 8 }}>{t('mapRouteFailed')}</Text>
      )}
    </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    zIndex: 30,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700' },
  endpoint: { fontSize: 13 },
  modes: { flexDirection: 'row', gap: 8 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 12,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryRow: { marginTop: 4 },
  summary: { fontSize: 16, fontWeight: '700' },
  alts: { flexDirection: 'row', gap: 8 },
  altChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
