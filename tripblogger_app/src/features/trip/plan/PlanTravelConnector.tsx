import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import type { PlanTravelMode } from '../types/plan';
import { PlanMinuteStepper } from './PlanMinuteStepper';
import {
  TRAVEL_MODE_COLOR,
  TRAVEL_MODE_ICON,
  TRAVEL_MODE_KEY,
} from './plan-stop-accents';
import { formatTravelMinutes } from './plan-travel-minutes';

type Props = {
  travelFromPrevSeconds: number | null;
  bufferMinutes: number;
  calculating: boolean;
  editable?: boolean;
  disabled?: boolean;
  /** Travel mode for this leg (override or used). Shown on the connector. */
  travelMode?: PlanTravelMode | null;
  onTravelMinutesChange?: (minutes: number) => void;
  onBufferMinutesChange?: (minutes: number) => void;
};

/**
 * Segment between stops: vertical path + travel duration.
 * Mode is an icon on the path — not a tag/chip.
 */
export function PlanTravelConnector({
  travelFromPrevSeconds,
  bufferMinutes,
  calculating,
  editable = false,
  disabled = false,
  travelMode = null,
  onTravelMinutesChange,
  onBufferMinutesChange,
}: Props) {
  const { t } = useI18n();
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');

  const travelMinutes = formatTravelMinutes(travelFromPrevSeconds);
  const modeColor = travelMode ? TRAVEL_MODE_COLOR[travelMode] : border;

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
      <View style={styles.pathCol}>
        <View style={[styles.railSeg, { backgroundColor: modeColor }]} />
        <View
          style={[
            styles.modeNode,
            {
              borderColor: modeColor,
              backgroundColor: surface,
            },
          ]}
          accessibilityLabel={
            travelMode ? t(TRAVEL_MODE_KEY[travelMode]) : t('planTravelEdit')
          }>
          <MaterialIcons
            name={travelMode ? TRAVEL_MODE_ICON[travelMode] : 'directions'}
            size={14}
            color={modeColor}
          />
        </View>
        <View style={[styles.railSeg, { backgroundColor: modeColor }]} />
      </View>

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
    paddingLeft: 20,
    paddingVertical: 2,
    gap: 10,
    minHeight: 36,
  },
  pathCol: {
    width: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  railSeg: {
    width: 2,
    flex: 1,
    borderRadius: 1,
  },
  modeNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
