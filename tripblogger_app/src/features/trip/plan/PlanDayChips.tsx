import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import type { TripDayDto } from '../types/plan';

export type PlanDaySelection =
  | { kind: 'day'; dayId: string }
  | { kind: 'ideas' };

type Props = {
  days: TripDayDto[];
  selection: PlanDaySelection;
  onSelect: (next: PlanDaySelection) => void;
  ideaCount: number;
};

/**
 * Horizontal day chips + idea-bucket chip above the stop list.
 */
export function PlanDayChips({ days, selection, onSelect, ideaCount }: Props) {
  const { t } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  const ideasActive = selection.kind === 'ideas';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {days.map((day) => {
        const active = selection.kind === 'day' && selection.dayId === day.id;
        return (
          <Pressable
            key={day.id}
            onPress={() => onSelect({ kind: 'day', dayId: day.id })}
            style={[
              styles.chip,
              {
                borderColor: active ? tint : border,
                backgroundColor: active ? `${tint}18` : 'transparent',
              },
            ]}>
            <Text style={{ color: active ? tint : text, fontWeight: '600', fontSize: 13 }}>
              {t('planDayChip', { day: day.dayIndex + 1 })}
            </Text>
            <Text style={{ color: active ? tint : muted, fontSize: 11 }}>
              {day.date.slice(5)}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => onSelect({ kind: 'ideas' })}
        style={[
          styles.chip,
          {
            borderColor: ideasActive ? tint : border,
            backgroundColor: ideasActive ? `${tint}18` : 'transparent',
          },
        ]}>
        <Text style={{ color: ideasActive ? tint : text, fontWeight: '600', fontSize: 13 }}>
          {t('planIdeaBucket')}
        </Text>
        {ideaCount > 0 ? (
          <Text style={{ color: ideasActive ? tint : muted, fontSize: 11 }}>{ideaCount}</Text>
        ) : null}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 72,
    gap: 2,
  },
});
