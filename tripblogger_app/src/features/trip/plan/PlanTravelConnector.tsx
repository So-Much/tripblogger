import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';

type Props = {
  /** Travel seconds from previous stop; null while unknown / awaiting server. */
  travelFromPrevSeconds: number | null;
  /** Buffer after previous stop (minutes). */
  bufferMinutes: number;
  /** Show calculating copy when travel is pending after reorder. */
  calculating: boolean;
};

/**
 * Segment between two stop cards: travel duration + buffer (or calculating).
 */
export function PlanTravelConnector({
  travelFromPrevSeconds,
  bufferMinutes,
  calculating,
}: Props) {
  const { t } = useI18n();
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  const travelMinutes =
    travelFromPrevSeconds != null ? Math.max(0, Math.round(travelFromPrevSeconds / 60)) : null;

  let travelLine: ReactNode = null;
  if (calculating) {
    travelLine = (
      <Text style={[styles.label, { color: tint }]}>{t('planTravelCalculating')}</Text>
    );
  } else if (travelMinutes != null) {
    travelLine = (
      <Text style={[styles.label, { color: muted }]}>
        {t('planTravelMinutes', { minutes: travelMinutes })}
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.rail, { backgroundColor: border }]} />
      <View style={styles.labels}>
        {travelLine}
        {bufferMinutes > 0 ? (
          <Text style={[styles.label, { color: muted }]}>
            {t('planBufferMinutes', { minutes: bufferMinutes })}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 28,
    paddingVertical: 4,
    gap: 10,
  },
  rail: {
    width: 2,
    alignSelf: 'stretch',
    minHeight: 20,
    borderRadius: 1,
  },
  labels: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
