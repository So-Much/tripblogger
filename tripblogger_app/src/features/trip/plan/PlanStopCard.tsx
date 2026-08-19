import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n, type TranslationKey } from '@/src/i18n';
import type { ScheduleConflict, TripStopDto } from '../types/plan';
import { PLAN_STOP_ROW_ACTION_SIZE } from './plan-stop-delete';

const CONFLICT_KEY: Record<ScheduleConflict['type'], TranslationKey> = {
  anchor_unreachable: 'planConflictAnchor',
  closed_on_arrival: 'planConflictClosed',
  travel_unknown: 'planConflictTravelUnknown',
};

type Props = {
  stop: TripStopDto;
  /** Hide schedule column (idea bucket). */
  showTime?: boolean;
  /** 1-based sequence; matches numbered map markers. Omit on Ideas. */
  stopIndex?: number | null;
  /** Day-chain color for the sequence number. */
  indexColor?: string;
  canDrag: boolean;
  isActive: boolean;
  onPress?: () => void;
  onSettingsPress?: () => void;
  onDeletePress?: () => void;
  onConflictPress?: (conflict: ScheduleConflict) => void;
  onLongPress?: () => void;
};

function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

/**
 * Stop row: sequence + time, name/meta, settings gear (editor).
 * Row tap focuses the map; long-press still starts reorder when enabled.
 */
export function PlanStopCard({
  stop,
  showTime = true,
  stopIndex = null,
  indexColor,
  canDrag,
  isActive,
  onPress,
  onSettingsPress,
  onDeletePress,
  onConflictPress,
  onLongPress,
}: Props) {
  const { t } = useI18n();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const warning = useThemeColor({}, 'warning');
  const danger = useThemeColor({}, 'danger');

  const arrive = formatClock(stop.schedule?.arriveAt);
  const start = formatClock(stop.schedule?.startAt);
  const timeLabel =
    stop.schedule?.skipped || stop.status === 'skipped'
      ? '—'
      : stop.schedule?.arriveAt
        ? arrive
        : start;

  const conflicts = stop.conflicts ?? [];

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: surface,
          borderColor: border,
          opacity: isActive ? 0.92 : stop.status === 'skipped' ? 0.55 : 1,
        },
      ]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={180}
        disabled={isActive}
        style={styles.main}>
        {stopIndex != null ? (
          <Text style={[styles.index, { color: indexColor ?? text }]}>{stopIndex}</Text>
        ) : null}
        {showTime ? (
          <View style={styles.timeCol}>
            <Text style={[styles.time, { color: text }]}>{timeLabel}</Text>
            {stop.anchorTime ? (
              <Text style={[styles.anchor, { color: muted }]}>@{stop.anchorTime}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.timeCol}>
            <MaterialIcons name="lightbulb-outline" size={18} color={muted} />
          </View>
        )}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <MaterialIcons
              name="drag-indicator"
              size={20}
              color={canDrag ? muted : border}
            />
            <Text style={[styles.title, { color: text }]} numberOfLines={2}>
              {stop.name}
            </Text>
          </View>
          <Text style={[styles.meta, { color: muted }]}>
            {stop.durationMinutes}′
            {stop.priority === 'must' ? ` · ${t('planPriorityMust')}` : ''}
            {stop.status !== 'todo' ? ` · ${statusLabel(stop.status, t)}` : ''}
            {stop.tags.includes('accommodation') ? ` · ${t('planTagAccommodation')}` : ''}
            {stop.tags.includes('entry_point') ? ` · ${t('planTagEntryPoint')}` : ''}
          </Text>
          {conflicts.length > 0 ? (
            <View style={styles.chips}>
              {conflicts.map((c) => (
                <Pressable
                  key={`${c.stopId}-${c.type}`}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onConflictPress?.(c);
                  }}
                  style={[
                    styles.chip,
                    {
                      borderColor: c.type === 'closed_on_arrival' ? danger : warning,
                      backgroundColor:
                        c.type === 'closed_on_arrival' ? `${danger}14` : `${warning}14`,
                    },
                  ]}>
                  <Text
                    style={{
                      color: c.type === 'closed_on_arrival' ? danger : warning,
                      fontSize: 11,
                      fontWeight: '600',
                    }}>
                    {t(CONFLICT_KEY[c.type])}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
      {onDeletePress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planDeleteStop')}
          onPress={onDeletePress}
          hitSlop={4}
          style={styles.actionBtn}>
          <MaterialIcons name="delete-outline" size={20} color={danger} />
        </Pressable>
      ) : null}
      {onSettingsPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planStopSettings')}
          onPress={onSettingsPress}
          hitSlop={4}
          style={styles.actionBtn}>
          <MaterialIcons name="settings" size={20} color={muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function statusLabel(
  status: TripStopDto['status'],
  t: (key: TranslationKey) => string,
): string {
  switch (status) {
    case 'doing':
      return t('planStatusDoing');
    case 'done':
      return t('planStatusDone');
    case 'skipped':
      return t('planStatusSkipped');
    default:
      return t('planStatusTodo');
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 2,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  index: {
    minWidth: 16,
    paddingTop: 3,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  timeCol: {
    width: 44,
    alignItems: 'center',
    paddingTop: 2,
  },
  time: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  anchor: {
    fontSize: 10,
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginLeft: 26,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginLeft: 26,
    marginTop: 2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionBtn: {
    width: PLAN_STOP_ROW_ACTION_SIZE,
    height: PLAN_STOP_ROW_ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
