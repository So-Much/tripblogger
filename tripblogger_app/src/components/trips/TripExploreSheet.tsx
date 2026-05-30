import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { MapExplorePin, MapRouteStop } from '@/src/types/trip-map';
import type { TripDto } from '@/src/types/trip';

type TripExploreSheetProps = {
  pins: MapExplorePin[];
  loading: boolean;
  checkpointLabel?: string | null;
  activeTrip?: TripDto | null;
  nextStop?: MapRouteStop | null;
  selectedPinId?: string | null;
  onPinPress: (pin: MapExplorePin) => void;
  onNavigateNextStop?: () => void;
  onTripPress?: () => void;
};

export function TripExploreSheet({
  pins,
  loading,
  checkpointLabel,
  activeTrip,
  nextStop,
  selectedPinId,
  onPinPress,
  onNavigateNextStop,
  onTripPress,
}: TripExploreSheetProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const isActiveTrip = activeTrip?.status === 'ACTIVE';
  const title = isActiveTrip && nextStop
    ? `Điểm tiếp theo: ${nextStop.name}`
    : checkpointLabel
      ? `Checkpoint quanh ${checkpointLabel}`
      : 'Địa điểm gần bạn';

  return (
    <View style={[styles.sheet, { borderColor: border, backgroundColor: `${card}F2` }]}>
      <View style={[styles.handle, { backgroundColor: muted }]} />

      {activeTrip ? (
        <PressableScale style={[styles.tripBanner, { borderColor: border }]} onPress={onTripPress}>
          <IconSymbol name="location.fill" size={18} color={tint} />
          <View style={styles.tripBannerText}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {activeTrip.title}
            </ThemedText>
            {nextStop ? (
              <ThemedText style={{ color: muted, fontSize: 12 }} numberOfLines={1}>
                {isActiveTrip ? 'Đang đi tới' : 'Tiếp theo'}: {nextStop.name}
              </ThemedText>
            ) : (
              <ThemedText style={{ color: muted, fontSize: 12 }}>
                Chuyến đi đang diễn ra
              </ThemedText>
            )}
          </View>
          <IconSymbol name="chevron.right" size={16} color={muted} />
        </PressableScale>
      ) : null}

      {isActiveTrip && nextStop && onNavigateNextStop ? (
        <PressableScale
          style={[styles.navigateBtn, { backgroundColor: cta }]}
          onPress={onNavigateNextStop}>
          <IconSymbol name="location.fill" size={18} color={onCta} />
          <ThemedText type="defaultSemiBold" style={{ color: onCta, flex: 1 }} numberOfLines={1}>
            Chỉ đường tới {nextStop.name}
          </ThemedText>
        </PressableScale>
      ) : null}

      <ThemedText type="defaultSemiBold" style={styles.title}>
        {title}
      </ThemedText>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={tint} />
      ) : (
        <FlatList
          data={pins}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ThemedText style={[styles.empty, { color: muted }]}>
              Không có địa điểm gần đây. Thử tìm checkpoint khác.
            </ThemedText>
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
              <View style={[styles.ratingBadge, { backgroundColor: `${cta}18` }]}>
                <ThemedText style={{ color: cta, fontWeight: '700', fontSize: 12 }}>
                  {item.avgRating > 0 ? item.avgRating.toFixed(1) : '—'}
                </ThemedText>
              </View>
              <View style={styles.rowBody}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText style={{ color: muted, fontSize: 12 }} numberOfLines={1}>
                  {item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : ''}
                  {item.address ? ` · ${item.address}` : ''}
                </ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={14} color={muted} />
            </PressableScale>
          )}
        />
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
    maxHeight: '38%',
    minHeight: 180,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
    opacity: 0.35,
  },
  tripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  tripBannerText: {
    flex: 1,
    gap: 2,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    marginBottom: 6,
  },
  loader: {
    marginTop: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  ratingBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
  },
});
