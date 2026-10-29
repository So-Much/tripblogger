import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { DEFAULT_CURRENCY, formatCurrency } from '@/src/utils/format-currency';
import type { ScheduleConflict, TripStopDto } from '../types/plan';
import {
  PlanStopAccentPill,
  PlanStopDiagonalBanner,
} from './PlanStopAccentViews';
import { buildPlanStopAccents, PLAN_STOP_ACCENT_PALETTE } from './plan-stop-accents';
import { PLAN_STOP_CARD_BORDER_WIDTH } from './plan-sheet-layout';
import { stopCostTotal } from './plan-stop-cost';
import { deriveStopDisplayStatus } from './plan-stop-status';

const FIXED_TIME_COLOR = PLAN_STOP_ACCENT_PALETTE.fixedTime;

type Props = {
  stop: TripStopDto;
  showTime?: boolean;
  stopIndex?: number | null;
  indexColor?: string;
  canDrag: boolean;
  isActive: boolean;
  onPress?: () => void;
  onSettingsPress?: () => void;
  onDeletePress?: () => void;
  onDepartPress?: () => void;
  onConflictPress?: (conflict: ScheduleConflict) => void;
  onLongPress?: () => void;
};

function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

function accentLabel(
  accent: { key?: string; labelKey?: TranslationKey; label?: string },
  t: (key: TranslationKey) => string,
): string {
  if (accent.key === 'anchor' && accent.labelKey && accent.label) {
    return `${t(accent.labelKey)} · ${accent.label}`;
  }
  if (accent.labelKey && accent.label) {
    return `${t(accent.labelKey)} · ${accent.label}`;
  }
  return accent.labelKey ? t(accent.labelKey) : (accent.label ?? '');
}

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
  onDepartPress,
  onConflictPress,
  onLongPress,
}: Props) {
  const { t, language } = useI18n();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');

  const arrive = formatClock(stop.schedule?.arriveAt);
  const start = formatClock(stop.schedule?.startAt);
  const skipped = stop.schedule?.skipped || stop.status === 'skipped';
  const { diagonalTr, pills, edgeStripe, fixedTime } = buildPlanStopAccents(stop);

  // Always prefer scheduled arrive; fixed-time is a separate pill — never replace arrive clock.
  const timeLabel = skipped
    ? '—'
    : stop.schedule?.arriveAt
      ? arrive
      : start;

  const costTotal = stopCostTotal(stop);
  const costCurrency = stop.estimatedCostCurrency ?? DEFAULT_CURRENCY;
  const displayStatus = deriveStopDisplayStatus(stop);
  const showDepart = onDepartPress != null && !skipped && displayStatus !== 'done';

  const cardBorderColor = fixedTime ? FIXED_TIME_COLOR : border;
  const leftStripeColor = fixedTime
    ? FIXED_TIME_COLOR
    : edgeStripe?.color ?? border;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.cardFace,
          fixedTime ? styles.cardFaceFixedTime : null,
          {
            backgroundColor: fixedTime ? `${FIXED_TIME_COLOR}0D` : surface,
            borderColor: cardBorderColor,
            borderLeftColor: leftStripeColor,
            borderLeftWidth: fixedTime || edgeStripe ? 4 : PLAN_STOP_CARD_BORDER_WIDTH,
            opacity: isActive ? 0.92 : displayStatus === 'skipped' ? 0.55 : 1,
          },
        ]}>
        {diagonalTr ? (
          <PlanStopDiagonalBanner
            key={diagonalTr.key}
            accent={diagonalTr}
            label={accentLabel(diagonalTr, t)}
          />
        ) : null}

        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={180}
          disabled={isActive}
          style={[styles.main, diagonalTr ? styles.mainWithBanner : null]}>
          {stopIndex != null ? (
            <Text style={[styles.index, { color: indexColor ?? text }]}>{stopIndex}</Text>
          ) : null}
          {showTime ? (
            <View style={styles.timeCol}>
              <Text style={[styles.time, { color: text }]}>{timeLabel}</Text>
              {fixedTime && stop.anchorTime ? (
                <View style={styles.fixedTimeBlock}>
                  <View style={[styles.fixedTimeRule, { backgroundColor: FIXED_TIME_COLOR }]} />
                  <View style={styles.fixedTimeRow}>
                    <MaterialIcons
                      name="confirmation-number"
                      size={10}
                      color={FIXED_TIME_COLOR}
                    />
                    <Text style={[styles.fixedTimeText, { color: FIXED_TIME_COLOR }]}>
                      {stop.anchorTime}
                    </Text>
                  </View>
                </View>
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
              {showDepart ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('planDepartNow')}
                  onPress={onDepartPress}
                  hitSlop={6}
                  style={[styles.departBtn, { borderColor: tint }]}>
                  <MaterialIcons name="directions-walk" size={13} color={tint} />
                </Pressable>
              ) : null}
              {onSettingsPress ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('planStopSettings')}
                  onPress={onSettingsPress}
                  hitSlop={6}
                  style={styles.inlineBtn}>
                  <MaterialIcons name="tune" size={15} color={muted} />
                </Pressable>
              ) : null}
              {onDeletePress ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('planDeleteStop')}
                  onPress={onDeletePress}
                  hitSlop={6}
                  style={styles.inlineBtn}>
                  <MaterialIcons name="close" size={15} color={danger} />
                </Pressable>
              ) : null}
            </View>
            {pills.length > 0 ? (
              <View style={styles.pills}>
                {pills.map((accent) => (
                  <PlanStopAccentPill
                    key={accent.key}
                    accent={accent}
                    label={accentLabel({ ...accent, key: accent.key }, t)}
                  />
                ))}
              </View>
            ) : null}
            {costTotal > 0 ? (
              <View style={styles.costRow}>
                <MaterialIcons name="payments" size={12} color="#059669" />
                <Text style={styles.costText}>
                  {formatCurrency(costTotal, { language, currency: costCurrency })}
                </Text>
              </View>
            ) : null}
            {conflictsInteractive(stop.conflicts) ? (
              <View style={styles.chips}>
                {(stop.conflicts ?? []).map((c) => (
                  <Pressable
                    key={`${c.stopId}-${c.type}`}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      onConflictPress?.(c);
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor:
                          c.type === 'closed_on_arrival' ? danger : '#D97706',
                        backgroundColor:
                          c.type === 'closed_on_arrival'
                            ? `${danger}22`
                            : '#D9770622',
                      },
                    ]}>
                    <Text
                      style={{
                        color: c.type === 'closed_on_arrival' ? danger : '#D97706',
                        fontSize: 10,
                        fontWeight: '700',
                      }}>
                      {t(
                        c.type === 'anchor_unreachable'
                          ? 'planConflictAnchor'
                          : c.type === 'closed_on_arrival'
                            ? 'planConflictClosed'
                            : 'planConflictTravelUnknown',
                      )}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function conflictsInteractive(conflicts: ScheduleConflict[] | undefined): boolean {
  return (conflicts?.length ?? 0) > 0;
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: 12,
  },
  cardFace: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: PLAN_STOP_CARD_BORDER_WIDTH,
    borderRadius: 12,
    position: 'relative',
  },
  cardFaceFixedTime: {
    borderWidth: 2,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 4,
  },
  /** Keep title/actions clear of top-right diagonal banner. */
  mainWithBanner: {
    paddingRight: 28,
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
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    gap: 3,
  },
  time: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  fixedTimeBlock: {
    alignItems: 'center',
    gap: 2,
    width: '100%',
  },
  fixedTimeRule: {
    width: 28,
    height: 2,
    borderRadius: 1,
  },
  fixedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fixedTimeText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  body: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginLeft: 26,
    marginTop: 1,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 26,
    marginTop: 2,
  },
  costText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    fontVariant: ['tabular-nums'],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginLeft: 26,
    marginTop: 2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inlineBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  departBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
});
