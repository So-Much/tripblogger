import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { TripDto } from '@/src/types/trip';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { MapExplorePin } from '@/src/types/trip-map';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';
import { resolveLocationTypeVisual } from '@/src/utils/location-type-display';

type PlanPanelProps = {
  plan: TripDto | null;
  pinnedLocation: MapExplorePin | null;
  cityHighlights: MapExplorePin[];
  nearbyProvinceHighlights: MapExplorePin[];
  globalHighlights: MapExplorePin[];
  onAddRecommendation: (pin: MapExplorePin) => void;
  onRename: (title: string) => void;
  onChangeDates: (startDate: string, endDate: string) => void;
  onStatus: (status: TripDto['status']) => void;
};

export function PlanPanel({
  plan,
  pinnedLocation,
  cityHighlights,
  nearbyProvinceHighlights,
  globalHighlights,
  onAddRecommendation,
  onRename,
  onChangeDates,
  onStatus,
}: PlanPanelProps) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={[styles.wrap, { borderColor: border, backgroundColor: card }]}>
      <ThemedText type="defaultSemiBold">{plan ? 'Thiết lập kế hoạch' : 'Bắt đầu kế hoạch'}</ThemedText>
      {plan ? (
        <>
          <TextInput
            defaultValue={plan.title}
            onEndEditing={(e) => onRename(e.nativeEvent.text)}
            placeholder="Tên kế hoạch"
            style={[styles.input, { borderColor: border }]}
          />
          <View style={styles.row}>
            <TextInput
              defaultValue={plan.startDate}
              onEndEditing={(e) => onChangeDates(e.nativeEvent.text, plan.endDate)}
              placeholder="YYYY-MM-DD"
              style={[styles.input, styles.dateInput, { borderColor: border }]}
            />
            <TextInput
              defaultValue={plan.endDate}
              onEndEditing={(e) => onChangeDates(plan.startDate, e.nativeEvent.text)}
              placeholder="YYYY-MM-DD"
              style={[styles.input, styles.dateInput, { borderColor: border }]}
            />
          </View>
          <View style={styles.row}>
            <Pressable onPress={() => onStatus('ACTIVE')} style={[styles.btn, { borderColor: tint }]}>
              <ThemedText>Bắt đầu</ThemedText>
            </Pressable>
            <Pressable onPress={() => onStatus('COMPLETED')} style={[styles.btn, { borderColor: border }]}>
              <ThemedText>Hoàn tất</ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={[styles.empty, { borderColor: border }]}>
          <ThemedText style={{ color: muted }}>
            Chạm nút Thêm ở địa điểm bên dưới để tạo kế hoạch tự động.
          </ThemedText>
        </View>
      )}
      <ThemedText type="defaultSemiBold">Địa điểm lý tưởng</ThemedText>
      {pinnedLocation ? (
        <View>
          <ThemedText style={[styles.groupTitle, { color: muted }]}>Vị trí đang ghim</ThemedText>
          <View style={styles.recoRow}>
            <LocationTypeIcon locationType={pinnedLocation.locationType ?? undefined} size="sm" />
            <View style={styles.recoText}>
              <ThemedText
                numberOfLines={1}
                style={{ color: resolveLocationTypeVisual(pinnedLocation.locationType ?? undefined).color, fontWeight: '700' }}>
                {pinnedLocation.name}
              </ThemedText>
            </View>
            <Pressable onPress={() => onAddRecommendation(pinnedLocation)} style={[styles.btn, { borderColor: border }]}>
              <ThemedText>Thêm</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
      {cityHighlights.slice(0, 3).map((pin) => (
        <View key={pin.id} style={styles.recoRow}>
          <LocationTypeIcon locationType={pin.locationType ?? undefined} size="sm" />
          <View style={styles.recoText}>
            <ThemedText
              numberOfLines={1}
              style={{ color: resolveLocationTypeVisual(pin.locationType ?? undefined).color, fontWeight: '700' }}>
              {pin.name}
            </ThemedText>
            <ThemedText numberOfLines={1} style={{ color: muted, fontSize: 12 }}>
              {pin.locationType?.name ?? 'Địa điểm'}{pin.distanceKm != null ? ` · ${pin.distanceKm.toFixed(1)} km` : ''}
            </ThemedText>
          </View>
          <Pressable onPress={() => onAddRecommendation(pin)} style={[styles.btn, { borderColor: border }]}>
            <ThemedText>Thêm</ThemedText>
          </Pressable>
        </View>
      ))}
      {nearbyProvinceHighlights.length ? (
        <>
          <ThemedText style={[styles.groupTitle, { color: muted }]}>Nổi bật tỉnh/thành lân cận</ThemedText>
          {nearbyProvinceHighlights.slice(0, 3).map((pin) => (
            <View key={`near-${pin.id}`} style={styles.recoRow}>
              <LocationTypeIcon locationType={pin.locationType ?? undefined} size="sm" />
              <View style={styles.recoText}>
                <ThemedText numberOfLines={1} style={{ color: resolveLocationTypeVisual(pin.locationType ?? undefined).color, fontWeight: '700' }}>
                  {pin.name}
                </ThemedText>
              </View>
              <Pressable onPress={() => onAddRecommendation(pin)} style={[styles.btn, { borderColor: border }]}>
                <ThemedText>Thêm</ThemedText>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}
      {globalHighlights.length ? (
        <>
          <ThemedText style={[styles.groupTitle, { color: muted }]}>Nổi bật toàn cục</ThemedText>
          {globalHighlights.slice(0, 3).map((pin) => (
            <View key={`global-${pin.id}`} style={styles.recoRow}>
              <LocationTypeIcon locationType={pin.locationType ?? undefined} size="sm" />
              <View style={styles.recoText}>
                <ThemedText numberOfLines={1} style={{ color: resolveLocationTypeVisual(pin.locationType ?? undefined).color, fontWeight: '700' }}>
                  {pin.name}
                </ThemedText>
              </View>
              <Pressable onPress={() => onAddRecommendation(pin)} style={[styles.btn, { borderColor: border }]}>
                <ThemedText>Thêm</ThemedText>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 8 },
  empty: { borderWidth: 1, borderRadius: 12, padding: 10 },
  row: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  dateInput: { flex: 1 },
  btn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  recoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recoText: { flex: 1, minWidth: 0 },
  groupTitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
