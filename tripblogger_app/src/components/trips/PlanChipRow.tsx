import { ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import type { TripDto } from '@/src/types/trip';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';

type PlanChipRowProps = {
  plans: TripDto[];
  selectedTripId: string | null;
  onSelect: (tripId: string) => void;
  onCreateNew: () => void;
};

export function PlanChipRow({ plans, selectedTripId, onSelect, onCreateNew }: PlanChipRowProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {plans.map((plan) => {
        const active = plan.id === selectedTripId;
        return (
          <PressableScale
            key={plan.id}
            style={[styles.chip, { borderColor: active ? tint : border, backgroundColor: active ? `${tint}14` : 'transparent' }]}
            onPress={() => onSelect(plan.id)}>
            <ThemedText numberOfLines={1} style={styles.chipText}>
              {plan.title}
            </ThemedText>
          </PressableScale>
        );
      })}
      <PressableScale style={[styles.chip, { borderColor: tint }]} onPress={onCreateNew}>
        <ThemedText style={styles.chipText}>{t('tripPlanNewChip')}</ThemedText>
      </PressableScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2, paddingRight: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 170 },
  chipText: { fontSize: 12, fontWeight: '700' },
});
