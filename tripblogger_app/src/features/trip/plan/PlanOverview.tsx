import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import type { TripDayDto } from '../types/plan';
import { buildDayChains } from './plan-day-chains';
import { planDayColor, planDayColorAlpha } from './plan-day-color';

type Props = {
  days: TripDayDto[];
  onSelectDay: (dayId: string) => void;
};

/**
 * Summary of every day chain. Tap a card to open that day's detail tab.
 */
export function PlanOverview({ days, onSelectDay }: Props) {
  const { t } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const chains = useMemo(() => buildDayChains(days), [days]);

  return (
    <View style={styles.wrap}>
      {chains.map((chain) => {
        const day = days.find((d) => d.id === chain.dayId);
        const color = planDayColor(chain.dayIndex);
        const fill = planDayColorAlpha(chain.dayIndex, '18');
        const names = chain.stops.map((s) => s.name).filter(Boolean);
        return (
          <Pressable
            key={chain.dayId}
            accessibilityRole="button"
            accessibilityLabel={t('planDayChip', { day: chain.dayIndex + 1 })}
            onPress={() => onSelectDay(chain.dayId)}
            style={[styles.card, { borderColor: color, backgroundColor: fill }]}>
            <View style={[styles.accent, { backgroundColor: color }]} />
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color }]}>
                  {t('planDayChip', { day: chain.dayIndex + 1 })}
                </Text>
                {day ? (
                  <Text style={[styles.date, { color: muted }]}>{day.date.slice(5)}</Text>
                ) : null}
              </View>
              {names.length > 0 ? (
                <Text style={[styles.chain, { color: text }]} numberOfLines={3}>
                  {names.join(' → ')}
                </Text>
              ) : (
                <Text style={[styles.chain, { color: muted }]}>{t('planOverviewEmptyDay')}</Text>
              )}
              <Text style={[styles.count, { color: muted }]}>
                {t('planOverviewStopCount', { count: chain.stops.length })}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={color} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 72,
  },
  accent: {
    width: 6,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
  },
  chain: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  count: {
    fontSize: 11,
    fontWeight: '600',
  },
});
