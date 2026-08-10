import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n, type TranslationKey } from '@/src/i18n';
import type { ScheduleConflict, TripStopDto } from '../types/plan';

const CONFLICT_KEY: Record<ScheduleConflict['type'], TranslationKey> = {
  anchor_unreachable: 'planConflictAnchor',
  closed_on_arrival: 'planConflictClosed',
  travel_unknown: 'planConflictTravelUnknown',
};

type Props = {
  stop: TripStopDto;
  /** Hide schedule column (idea bucket). */
  showTime?: boolean;
  canDrag: boolean;
  isActive: boolean;
  onLongPress?: () => void;
};

function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

/**
 * Stop row: time column + name/meta + conflict chips (display only; resolve = Task 15).
 */
export function PlanStopCard({
  stop,
  showTime = true,
  canDrag,
  isActive,
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
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={180}
      disabled={isActive}
      style={[
        styles.row,
        {
          backgroundColor: surface,
          borderColor: border,
          opacity: isActive ? 0.92 : stop.status === 'skipped' ? 0.55 : 1,
        },
      ]}>
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
        </Text>
        {conflicts.length > 0 ? (
          <View style={styles.chips}>
            {conflicts.map((c) => (
              <View
                key={`${c.stopId}-${c.type}`}
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
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
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
    alignItems: 'flex-start',
    marginHorizontal: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  timeCol: {
    width: 48,
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
});
