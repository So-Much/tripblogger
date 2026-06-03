import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LocationNameLabel } from '@/src/components/locations/LocationNameLabel';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import type { MapExplorePin, MapRouteStop } from '@/src/types/trip-map';
import type { TripDto } from '@/src/types/trip';

type TripExploreSheetProps = {
  pins: MapExplorePin[];
  loading: boolean;
  checkpointLabel?: string | null;
  activeTrip?: TripDto | null;
  routeStops?: MapRouteStop[];
  nextStop?: MapRouteStop | null;
  selectedPinId?: string | null;
  navSummary?: string | null;
  navigationActive?: boolean;
  navigationDestName?: string | null;
  onPinPress: (pin: MapExplorePin) => void;
  onNavigateNextStop?: () => void;
  onStopNavigation?: () => void;
  onTripPress?: () => void;
  bottomInset?: number;
  visitedCount?: number;
  minimalActive?: boolean;
};

function pinMeta(item: MapExplorePin): string | null {
  const parts: string[] = [];
  if (item.distanceKm != null) parts.push(`${item.distanceKm.toFixed(1)} km`);
  if (item.avgRating > 0) parts.push(`★${item.avgRating.toFixed(1)}`);
  return parts.length ? parts.join(' · ') : null;
}

export function TripExploreSheet({
  pins,
  loading,
  checkpointLabel,
  activeTrip,
  routeStops = [],
  nextStop,
  selectedPinId,
  navSummary,
  navigationActive = false,
  navigationDestName,
  onPinPress,
  onNavigateNextStop,
  onStopNavigation,
  onTripPress,
  bottomInset = 0,
  visitedCount = 0,
  minimalActive = false,
}: TripExploreSheetProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const isActiveTrip = activeTrip?.status === 'ACTIVE';
  const title = isActiveTrip && nextStop
    ? `Tiếp theo: ${nextStop.name}`
    : checkpointLabel
      ? `Quanh ${checkpointLabel}`
      : 'Gần bạn';

  if (navigationActive) {
    return (
      <View style={[styles.sheet, styles.navSheet, { borderColor: border, backgroundColor: `${card}FA` }]}>
        <View style={styles.navHud}>
          <PressableScale style={[styles.endBtn, { borderColor: border }]} onPress={onStopNavigation}>
            <ThemedText style={{ fontWeight: '700', fontSize: 13 }}>Kết thúc</ThemedText>
          </PressableScale>
          <View style={styles.navHudText}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {navigationDestName ?? 'Đích đến'}
            </ThemedText>
            <ThemedText style={{ color: muted, fontSize: 12 }} numberOfLines={1}>
              {navSummary ?? 'Đang theo dõi GPS…'}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.sheet,
        { borderColor: border, backgroundColor: `${card}F2`, bottom: bottomInset },
      ]}>
      <View style={[styles.handle, { backgroundColor: muted }]} />

      {isActiveTrip && nextStop && onNavigateNextStop ? (
        <PressableScale style={[styles.navRow, { backgroundColor: cta }]} onPress={onNavigateNextStop}>
          <IconSymbol name="location.fill" size={16} color={onCta} />
          <ThemedText type="defaultSemiBold" style={{ color: onCta, flex: 1 }} numberOfLines={1}>
            Chỉ đường{navSummary ? ` · ${navSummary}` : ''}
          </ThemedText>
        </PressableScale>
      ) : activeTrip ? (
        <PressableScale style={[styles.tripRow, { borderColor: border }]} onPress={onTripPress}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ flex: 1 }}>
            {activeTrip.title}
          </ThemedText>
          <IconSymbol name="chevron.right" size={14} color={muted} />
        </PressableScale>
      ) : null}

      {isActiveTrip && minimalActive && nextStop ? (
        <ThemedText style={{ color: tint, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
          {t('tripHudProgress', {
            visited: visitedCount,
            total: routeStops.length,
            name: nextStop.name,
          })}
        </ThemedText>
      ) : null}

      {!minimalActive ? (
        <ThemedText style={[styles.title, { color: muted }]} numberOfLines={1}>
          {title}
        </ThemedText>
      ) : null}

      {!minimalActive ? (
        loading ? (
          <ActivityIndicator style={styles.loader} color={tint} />
        ) : (
          <FlatList
            data={pins}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <ThemedText style={[styles.empty, { color: muted }]}>Không có địa điểm gần đây.</ThemedText>
            }
            renderItem={({ item }) => (
              <PressableScale
                style={[
                  styles.row,
                  {
                    borderColor: selectedPinId === item.id ? cta : border,
                    backgroundColor: selectedPinId === item.id ? `${cta}10` : 'transparent',
                  },
                ]}
                onPress={() => onPinPress(item)}>
                <LocationNameLabel
                  name={item.name}
                  locationType={item.locationType}
                  variant="dense"
                  selected={selectedPinId === item.id}
                  subtitle={pinMeta(item)}
                />
              </PressableScale>
            )}
          />
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '34%',
    minHeight: 140,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
    opacity: 0.35,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  loader: { marginTop: 12 },
  list: { flex: 1 },
  listContent: { gap: 4, paddingBottom: 4 },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 12,
  },
  navSheet: {
    maxHeight: 88,
    minHeight: 72,
  },
  navHud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  endBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  navHudText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
