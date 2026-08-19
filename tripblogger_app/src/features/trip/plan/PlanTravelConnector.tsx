import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { PlanMinuteStepper } from './PlanMinuteStepper';
import { formatTravelMinutes } from './plan-travel-minutes';

type Props = {
  /** Travel seconds from previous stop; null while unknown / awaiting server. */
  travelFromPrevSeconds: number | null;
  /** Buffer after previous stop (minutes). */
  bufferMinutes: number;
  /** Show calculating copy when travel is pending after reorder. */
  calculating: boolean;
  editable?: boolean;
  disabled?: boolean;
  onTravelMinutesChange?: (minutes: number) => void;
  onBufferMinutesChange?: (minutes: number) => void;
};

/**
 * Segment between two stop cards: travel duration + buffer (or calculating).
 * When editable, compact steppers persist minutes without growing the row.
 */
export function PlanTravelConnector({
  travelFromPrevSeconds,
  bufferMinutes,
  calculating,
  editable = false,
  disabled = false,
  onTravelMinutesChange,
  onBufferMinutesChange,
}: Props) {
  const { t } = useI18n();
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  const travelMinutes = formatTravelMinutes(travelFromPrevSeconds);

  let travelLine: ReactNode = null;
  if (calculating) {
    travelLine = (
      <Text style={[styles.label, { color: tint }]}>{t('planTravelCalculating')}</Text>
    );
  } else if (editable && onTravelMinutesChange) {
    travelLine = (
      <PlanMinuteStepper
        icon="directions"
        value={travelMinutes ?? 1}
        min={1}
        unknown={travelMinutes == null}
        disabled={disabled}
        accessibilityValueLabel={
          travelMinutes == null
            ? t('planSetTravel')
            : t('planTravelMinutes', { minutes: travelMinutes })
        }
        onChange={onTravelMinutesChange}
      />
    );
  } else if (travelMinutes != null) {
    travelLine = (
      <Text style={[styles.label, { color: muted }]}>
        {t('planTravelMinutes', { minutes: travelMinutes })}
      </Text>
    );
  }

  const showBuffer = editable || bufferMinutes > 0;

  return (
    <View style={styles.wrap}>
      <View style={[styles.rail, { backgroundColor: border }]} />
      <View style={styles.labels}>
        {travelLine}
        {showBuffer && editable && onBufferMinutesChange ? (
          <PlanMinuteStepper
            icon="schedule"
            value={bufferMinutes}
            min={0}
            disabled={disabled}
            accessibilityValueLabel={t('planBufferMinutes', { minutes: bufferMinutes })}
            onChange={onBufferMinutesChange}
          />
        ) : showBuffer && !editable ? (
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
