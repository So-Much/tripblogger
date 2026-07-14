import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import { TripLocationTypeFilterChip } from '@/src/components/trips/TripLocationTypeFilterChip';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { TRIP_LOCATION_TYPE_FILTERS } from '@/src/constants/trip-location-types';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { TripPlannerFilters } from '@/src/types/trip-planner';
import { toggleTripTypeCode } from '@/src/utils/trip-planner-filters';

export function countTripLocationFilters(f: TripPlannerFilters): number {
  let n = 0;
  if (f.typeCodes?.length) n += f.typeCodes.length;
  if (f.sort === 'popularity') n += 1;
  if ((f.radiusKm ?? 10) !== 10) n += 1;
  if ((f.minRating ?? 0) > 0) n += 1;
  if (f.keyword?.trim()) n += 1;
  return n;
}

type TripLocationFilterSheetProps = {
  visible: boolean;
  draft: TripPlannerFilters;
  onChange: (next: TripPlannerFilters) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
};

export function TripLocationFilterSheet({
  visible,
  draft,
  onChange,
  onClose,
  onApply,
  onReset,
}: TripLocationFilterSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const allTypesSelected = !draft.typeCodes?.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('tripFilterCloseA11y')} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: card,
            borderColor: border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: muted }]} />
        <ThemedText type="subtitle">{t('tripFilterTitle')}</ThemedText>
        <ThemedText style={[styles.hint, { color: muted }]}>
          {draft.typeCodes?.length
            ? t('tripFilterTypesSelected', { count: draft.typeCodes.length })
            : t('tripFilterTypesHint')}
        </ThemedText>

        <ThemedText style={[styles.sectionLabel, { color: muted }]}>{t('tripFilterLocationTypes')}</ThemedText>
        <ScrollView
          style={styles.typeScroll}
          contentContainerStyle={styles.typeGrid}
          showsVerticalScrollIndicator={false}>
          <PressableScale
            style={[
              styles.allTile,
              {
                borderColor: allTypesSelected ? tint : border,
                backgroundColor: allTypesSelected ? `${tint}14` : card,
              },
            ]}
            onPress={() => onChange({ ...draft, typeCodes: undefined })}>
            <View style={[styles.allIcon, { backgroundColor: `${tint}18` }]}>
              <IconSymbol name="square.grid.2x2" size={20} color={tint} />
            </View>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: allTypesSelected ? tint : muted }}>
              {t('tripFilterAllTypes')}
            </ThemedText>
          </PressableScale>
          {TRIP_LOCATION_TYPE_FILTERS.map((typeFilter) => {
            const active = draft.typeCodes?.includes(typeFilter.code) ?? false;
            return (
              <TripLocationTypeFilterChip
                key={typeFilter.code}
                type={typeFilter}
                selected={active}
                onPress={() =>
                  onChange({
                    ...draft,
                    typeCodes: toggleTripTypeCode(draft.typeCodes, typeFilter.code),
                  })
                }
              />
            );
          })}
        </ScrollView>

        <ThemedText style={[styles.sectionLabel, { color: muted }]}>{t('shopFilterSort')}</ThemedText>
        <View style={styles.sortRow}>
          <PressableScale
            style={[
              styles.sortBtn,
              { borderColor: border, backgroundColor: draft.sort === 'rating' ? `${tint}18` : 'transparent' },
            ]}
            onPress={() => onChange({ ...draft, sort: 'rating' })}>
            <IconSymbol name="star.fill" size={14} color={tint} />
            <ThemedText style={{ fontWeight: '600', fontSize: 13 }}>{t('locationReviewSortRating')}</ThemedText>
          </PressableScale>
          <PressableScale
            style={[
              styles.sortBtn,
              {
                borderColor: border,
                backgroundColor: draft.sort === 'popularity' ? `${tint}18` : 'transparent',
              },
            ]}
            onPress={() => onChange({ ...draft, sort: 'popularity' })}>
            <IconSymbol name="flame.fill" size={14} color={tint} />
            <ThemedText style={{ fontWeight: '600', fontSize: 13 }}>{t('tripFilterFeatured')}</ThemedText>
          </PressableScale>
          <PressableScale
            style={[
              styles.sortBtn,
              {
                borderColor: border,
                backgroundColor: draft.sort === 'distance' ? `${tint}18` : 'transparent',
              },
            ]}
            onPress={() => onChange({ ...draft, sort: 'distance' })}>
            <IconSymbol name="location.fill" size={14} color={tint} />
            <ThemedText style={{ fontWeight: '600', fontSize: 13 }}>Gan nhat</ThemedText>
          </PressableScale>
        </View>
        <ThemedText style={[styles.sectionLabel, { color: muted }]}>Ban kinh (km)</ThemedText>
        <View style={styles.radiusRow}>
          {[5, 10, 20, 50].map((r) => (
            <PressableScale
              key={r}
              style={[
                styles.radiusChip,
                {
                  borderColor: border,
                  backgroundColor: (draft.radiusKm ?? 10) === r ? `${tint}18` : 'transparent',
                },
              ]}
              onPress={() => onChange({ ...draft, radiusKm: r })}>
              <ThemedText style={{ fontSize: 12 }}>{r}km</ThemedText>
            </PressableScale>
          ))}
        </View>
        <ThemedText style={[styles.sectionLabel, { color: muted }]}>Danh gia toi thieu</ThemedText>
        <View style={styles.radiusRow}>
          {[0, 3, 4, 4.5].map((r) => (
            <PressableScale
              key={String(r)}
              style={[
                styles.radiusChip,
                {
                  borderColor: border,
                  backgroundColor: (draft.minRating ?? 0) === r ? `${tint}18` : 'transparent',
                },
              ]}
              onPress={() => onChange({ ...draft, minRating: r })}>
              <ThemedText style={{ fontSize: 12 }}>{r === 0 ? 'Tat ca' : `${r}+`}</ThemedText>
            </PressableScale>
          ))}
        </View>
        <ThemedText style={[styles.sectionLabel, { color: muted }]}>Tu khoa</ThemedText>
        <ThemedTextInput
          placeholder="ca phe, hai san, bao tang..."
          value={draft.keyword ?? ''}
          onChangeText={(keyword) => onChange({ ...draft, keyword })}
        />

        <View style={styles.actions}>
          <PressableScale style={[styles.resetBtn, { borderColor: border }]} onPress={onReset}>
            <ThemedText style={{ fontWeight: '600' }}>{t('shopFilterReset')}</ThemedText>
          </PressableScale>
          <PressableScale style={[styles.applyBtn, { backgroundColor: cta }]} onPress={onApply}>
            <ThemedText style={{ color: onCta, fontWeight: '700' }}>{t('shopFilterApply')}</ThemedText>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  hint: { fontSize: 13 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  typeScroll: { maxHeight: 280 },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 4,
  },
  allTile: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
  },
  allIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortRow: { flexDirection: 'row', gap: 10 },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radiusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  sortBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  resetBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
