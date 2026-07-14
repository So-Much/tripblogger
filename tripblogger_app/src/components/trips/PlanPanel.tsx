import { Pressable, StyleSheet, TextInput, View, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { TripDto } from '@/src/types/trip';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { MapExplorePin } from '@/src/types/trip-map';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';
import { resolveLocationTypeVisual } from '@/src/utils/location-type-display';
import { useI18n } from '@/src/i18n';

type PlanPanelProps = {
  plan: TripDto | null;
  stopCount: number;
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
  stopCount,
  pinnedLocation,
  cityHighlights,
  nearbyProvinceHighlights,
  globalHighlights,
  onAddRecommendation,
  onRename,
  onChangeDates,
  onStatus,
}: PlanPanelProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');

  const confirmStatusChange = (status: TripDto['status']) => {
    if (stopCount > 0) {
      onStatus(status);
      return;
    }
    const isActive = status === 'ACTIVE';
    Alert.alert(
      t(isActive ? 'tripNoStopsActiveTitle' : 'tripNoStopsCompleteTitle'),
      t(isActive ? 'tripNoStopsActiveBody' : 'tripNoStopsCompleteBody'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t(isActive ? 'tripStartAnyway' : 'tripCompleteAnyway'), onPress: () => onStatus(status) },
      ],
    );
  };

  return (
    <View style={[styles.wrap, { borderColor: border, backgroundColor: card }]}>
      <ThemedText type="defaultSemiBold">{plan ? t('tripPlanSetup') : t('tripPlanStart')}</ThemedText>
      {plan ? (
        <>
          <TextInput
            defaultValue={plan.title}
            onEndEditing={(e) => onRename(e.nativeEvent.text)}
            placeholder={t('tripPlanNamePlaceholder')}
            style={[styles.input, { borderColor: border }]}
          />
          <View style={styles.row}>
            <TextInput
              defaultValue={plan.startDate}
              onEndEditing={(e) => onChangeDates(e.nativeEvent.text, plan.endDate)}
              placeholder={t('tripDatePlaceholder')}
              style={[styles.input, styles.dateInput, { borderColor: border }]}
            />
            <TextInput
              defaultValue={plan.endDate}
              onEndEditing={(e) => onChangeDates(plan.startDate, e.nativeEvent.text)}
              placeholder={t('tripDatePlaceholder')}
              style={[styles.input, styles.dateInput, { borderColor: border }]}
            />
          </View>
          <View style={styles.row}>
            <Pressable onPress={() => confirmStatusChange('ACTIVE')} style={[styles.btn, { borderColor: tint }]}>
              <ThemedText>{t('tripStartTrip')}</ThemedText>
            </Pressable>
            <Pressable onPress={() => confirmStatusChange('COMPLETED')} style={[styles.btn, { borderColor: border }]}>
              <ThemedText>{t('tripCompleteTrip')}</ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={[styles.empty, { borderColor: border }]}>
          <ThemedText style={{ color: muted }}>
            {t('tripPlanEmptyHint')}
          </ThemedText>
        </View>
      )}
      <ThemedText type="defaultSemiBold">{t('tripIdealPlaces')}</ThemedText>
      {pinnedLocation ? (
        <View>
          <ThemedText style={[styles.groupTitle, { color: muted }]}>{t('tripPinnedLocation')}</ThemedText>
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
              <ThemedText>{t('tripAddRoute')}</ThemedText>
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
              {pin.locationType?.name ?? t('tripPlaceFallback')}{pin.distanceKm != null ? ` · ${pin.distanceKm.toFixed(1)} km` : ''}
            </ThemedText>
          </View>
          <Pressable onPress={() => onAddRecommendation(pin)} style={[styles.btn, { borderColor: border }]}>
            <ThemedText>{t('tripAddRoute')}</ThemedText>
          </Pressable>
        </View>
      ))}
      {nearbyProvinceHighlights.length ? (
        <>
          <ThemedText style={[styles.groupTitle, { color: muted }]}>{t('tripNearbyProvinceHighlights')}</ThemedText>
          {nearbyProvinceHighlights.slice(0, 3).map((pin) => (
            <View key={`near-${pin.id}`} style={styles.recoRow}>
              <LocationTypeIcon locationType={pin.locationType ?? undefined} size="sm" />
              <View style={styles.recoText}>
                <ThemedText numberOfLines={1} style={{ color: resolveLocationTypeVisual(pin.locationType ?? undefined).color, fontWeight: '700' }}>
                  {pin.name}
                </ThemedText>
              </View>
              <Pressable onPress={() => onAddRecommendation(pin)} style={[styles.btn, { borderColor: border }]}>
                <ThemedText>{t('tripAddRoute')}</ThemedText>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}
      {globalHighlights.length ? (
        <>
          <ThemedText style={[styles.groupTitle, { color: muted }]}>{t('tripGlobalHighlights')}</ThemedText>
          {globalHighlights.slice(0, 3).map((pin) => (
            <View key={`global-${pin.id}`} style={styles.recoRow}>
              <LocationTypeIcon locationType={pin.locationType ?? undefined} size="sm" />
              <View style={styles.recoText}>
                <ThemedText numberOfLines={1} style={{ color: resolveLocationTypeVisual(pin.locationType ?? undefined).color, fontWeight: '700' }}>
                  {pin.name}
                </ThemedText>
              </View>
              <Pressable onPress={() => onAddRecommendation(pin)} style={[styles.btn, { borderColor: border }]}>
                <ThemedText>{t('tripAddRoute')}</ThemedText>
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
