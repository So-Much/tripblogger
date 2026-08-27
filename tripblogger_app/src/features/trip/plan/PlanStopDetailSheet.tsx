import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { formatApiError } from '@/src/utils/format-api-error';
import { DEFAULT_CURRENCY } from '@/src/utils/format-currency';
import { tripKeys } from '../hooks/trip-query-keys';
import {
  useMoveStopMutation,
  usePatchStopMutation,
} from '../hooks/useTripMutations';
import type {
  PatchStopDto,
  PlanTravelMode,
  StopPriority,
  StopStatus,
  StopCostItem,
  TripDayDto,
  TripDetailDto,
  TripStopDto,
} from '../types/plan';
import {
  applyLocalStopPatch,
  clockFromIso,
  patchAffectsLocalSchedule,
} from './applyLocalDaySchedule';
import { PlanMinuteStepper } from './PlanMinuteStepper';
import { PlanStopCostEditor } from './PlanStopCostEditor';
import { computeDepartNowDuration } from './plan-depart-now';
import { deriveStopDisplayStatus } from './plan-stop-status';
import {
  clampBufferMinutes,
  formatTravelMinutes,
  travelMinutesToSeconds,
} from './plan-travel-minutes';

const DURATION_STEP = 15;
const STAY_LONGER = 30;

const MODES: { value: PlanTravelMode | null; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: null, icon: 'alt-route' },
  { value: 'motorbike', icon: 'two-wheeler' },
  { value: 'car', icon: 'directions-car' },
  { value: 'foot', icon: 'directions-walk' },
  { value: 'bike', icon: 'pedal-bike' },
];

const MODE_KEY: Record<
  PlanTravelMode,
  'planModeMotorbike' | 'planModeCar' | 'planModeFoot' | 'planModeBike'
> = {
  motorbike: 'planModeMotorbike',
  car: 'planModeCar',
  foot: 'planModeFoot',
  bike: 'planModeBike',
};

const STATUS_DISPLAY: {
  value: StopStatus;
  key: TranslationKey;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { value: 'todo', key: 'planStatusTodo', icon: 'radio-button-unchecked' },
  { value: 'doing', key: 'planStatusDoing', icon: 'timelapse' },
  { value: 'done', key: 'planStatusDone', icon: 'check-circle' },
  { value: 'skipped', key: 'planStatusSkipped', icon: 'skip-next' },
];

type Props = {
  tripId: string;
  trip: TripDetailDto | null;
  stop: TripStopDto;
  prevStop?: TripStopDto | null;
  onClose: () => void;
};

function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

/**
 * Compact stop settings inside the Plan timeline BottomSheet.
 * Title lives on the sheet handle; this panel groups controls into dense cards.
 */
export function PlanStopSettingsPanel({
  tripId,
  trip,
  stop,
  prevStop = null,
  onClose,
}: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const patchStop = usePatchStopMutation();
  const moveStop = useMoveStopMutation();

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');

  const [anchorDraft, setAnchorDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const scrollRef = useRef<{ scrollTo: (opts: { y: number; animated?: boolean }) => void } | null>(
    null,
  );
  const scrollY = useRef(0);
  const fieldOffsets = useRef<Record<string, number>>({});

  useEffect(() => {
    setAnchorDraft(stop.anchorTime ?? '');
    setNoteDraft(stop.note ?? '');
    setError(null);
  }, [stop.id, stop.anchorTime, stop.note]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardPad(Math.max(0, e.endCoordinates.height - insets.bottom));
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardPad(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const scrollFieldIntoView = (fieldKey: string) => {
    const y = fieldOffsets.current[fieldKey];
    if (y == null) return;
    // Keep focused field ~120px below the top of the visible scroll area.
    const target = Math.max(0, y - 120);
    const run = () => scrollRef.current?.scrollTo({ y: target, animated: true });
    // Wait for keyboard + sheet extend animation.
    setTimeout(run, Platform.OS === 'ios' ? 80 : 160);
    setTimeout(run, 320);
  };

  const onFieldFocus = (fieldKey: string) => {
    scrollFieldIntoView(fieldKey);
  };

  const days = useMemo(() => trip?.days ?? [], [trip?.days]);
  const busy = patchStop.isPending || moveStop.isPending;
  const showTravel = stop.tripDayId != null && prevStop != null;
  const travelMinutes = formatTravelMinutes(stop.travelFromPrevSeconds);
  const bufferMinutes =
    prevStop != null ? (prevStop.bufferAfterMinutes ?? trip?.defaultBufferMinutes ?? 0) : 0;
  const displayStatus = deriveStopDisplayStatus(stop);
  const statusMeta = STATUS_DISPLAY.find((s) => s.value === displayStatus) ?? STATUS_DISPLAY[0];

  const applyPatch = (dto: PatchStopDto, opts?: { close?: boolean; stopId?: string }) => {
    const targetId = opts?.stopId ?? stop.id;
    setError(null);
    if (
      patchAffectsLocalSchedule(dto) ||
      dto.tags !== undefined ||
      dto.priority !== undefined ||
      dto.travelModeOverride !== undefined ||
      dto.note !== undefined ||
      dto.costItems !== undefined
    ) {
      queryClient.setQueryData<TripDetailDto>(tripKeys.detail(tripId), (old) =>
        old ? applyLocalStopPatch(old, targetId, dto) : old,
      );
    }
    patchStop.mutate(
      { tripId, stopId: targetId, dto },
      {
        onSuccess: () => {
          if (opts?.close) onClose();
        },
        onError: (err) => {
          void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
          setError(formatApiError(err, t('errorTitle')));
        },
      },
    );
  };

  const bumpDuration = (delta: number) => {
    const next = Math.max(DURATION_STEP, stop.durationMinutes + delta);
    if (next === stop.durationMinutes) return;
    applyPatch({ durationMinutes: next });
  };

  const setPriority = (priority: StopPriority) => {
    if (priority === stop.priority) return;
    applyPatch({ priority });
  };

  const toggleTag = (tag: 'accommodation') => {
    const has = stop.tags.includes(tag);
    const tags = has ? stop.tags.filter((x) => x !== tag) : [...stop.tags, tag];
    applyPatch({ tags });
  };

  const setMode = (mode: PlanTravelMode | null) => {
    if (mode === stop.travelModeOverride) return;
    applyPatch({ travelModeOverride: mode });
  };

  const clearAnchor = () => {
    setAnchorDraft('');
    applyPatch({ anchorTime: null });
  };

  const pinArrive = () => {
    const clock = clockFromIso(stop.schedule?.arriveAt);
    if (!clock) return;
    setAnchorDraft(clock);
    applyPatch({ anchorTime: clock });
  };

  const departNow = () => {
    const next = computeDepartNowDuration(stop, new Date(), DURATION_STEP);
    applyPatch({ durationMinutes: next });
  };

  const saveAnchorDraft = () => {
    const trimmed = anchorDraft.trim();
    if (!trimmed) {
      clearAnchor();
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(trimmed)) {
      setError(t('planAnchorInvalid'));
      return;
    }
    applyPatch({ anchorTime: trimmed });
  };

  const saveNoteDraft = () => {
    const trimmed = noteDraft.trim();
    const next = trimmed || null;
    if (next === (stop.note ?? null)) return;
    applyPatch({ note: next });
  };

  const saveCostItems = (items: StopCostItem[]) => {
    applyPatch({
      costItems: items,
      estimatedCostCurrency: items.length > 0 ? DEFAULT_CURRENCY : null,
    });
  };

  const changeDay = (day: TripDayDto | null) => {
    const toTripDayId = day?.id ?? null;
    if (toTripDayId === stop.tripDayId) return;
    setError(null);
    const toPosition = day
      ? day.stops.filter((s) => s.id !== stop.id).length
      : (trip?.ideaStops.filter((s) => s.id !== stop.id).length ?? 0);
    moveStop.mutate(
      { tripId, stopId: stop.id, dto: { toTripDayId, toPosition } },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(formatApiError(err, t('errorTitle'))),
      },
    );
  };

  const arrive = formatClock(stop.schedule?.arriveAt);
  const start = formatClock(stop.schedule?.startAt);
  const timeLabel =
    stop.schedule?.skipped || stop.status === 'skipped'
      ? '—'
      : stop.schedule?.arriveAt
        ? arrive
        : start;
  const timeCaption = stop.schedule?.arriveAt ? t('planArriveAt') : t('planStartAt');

  return (
    <BottomSheetScrollView
      ref={scrollRef as never}
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(insets.bottom, 8) + 16 + keyboardPad },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}>
      {stop.address ? (
        <Text style={[styles.address, { color: muted }]} numberOfLines={2}>
          {stop.address}
        </Text>
      ) : null}

      <View style={styles.priorityRow}>
        <ToggleChip
          active={stop.priority === 'must'}
          label={t('planPriorityMust')}
          icon="star"
          tint={tint}
          border={border}
          text={text}
          disabled={busy}
          onPress={() => setPriority('must')}
        />
        <ToggleChip
          active={stop.priority === 'nice'}
          label={t('planPriorityNice')}
          icon="star-border"
          tint={tint}
          border={border}
          text={text}
          disabled={busy}
          onPress={() => setPriority('nice')}
        />
        {displayStatus !== 'done' && displayStatus !== 'skipped' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('planDepartNow')}
            disabled={busy}
            onPress={departNow}
            style={[styles.departChip, { borderColor: tint, backgroundColor: `${tint}14` }]}>
            <MaterialIcons name="directions-walk" size={16} color={tint} />
            <Text style={{ color: tint, fontWeight: '700', fontSize: 12 }}>{t('planDepartNow')}</Text>
          </Pressable>
        ) : null}
      </View>

      <View
        onLayout={(e) => {
          fieldOffsets.current.time = e.nativeEvent.layout.y;
        }}>
      <CompactCard title={t('planStopSectionTimeStay')} border={border} muted={muted}>
        <View style={styles.splitRow}>
          <InfoPill icon="schedule" label={timeCaption} value={timeLabel} tint={tint} text={text} muted={muted} />
          <View style={styles.durationCluster}>
            <PlanMinuteStepper
              compact
              editable
              sheetAware
              value={stop.durationMinutes}
              min={DURATION_STEP}
              disabled={busy}
              accessibilityValueLabel={t('planDuration')}
              onChange={(minutes) => applyPatch({ durationMinutes: minutes })}
              onInputFocus={() => onFieldFocus('time')}
            />
            <Pressable
              disabled={busy}
              onPress={() => applyPatch({ durationMinutes: stop.durationMinutes + STAY_LONGER })}
              style={[styles.miniChip, { borderColor: border }]}>
              <MaterialIcons name="more-time" size={14} color={tint} />
              <Text style={[styles.miniChipText, { color: tint }]}>+{STAY_LONGER}′</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.anchorRow}>
          <MaterialIcons name="confirmation-number" size={14} color={muted} />
          <BottomSheetTextInput
            value={anchorDraft}
            onChangeText={setAnchorDraft}
            onFocus={() => onFieldFocus('time')}
            onBlur={saveAnchorDraft}
            placeholder={t('planAnchorLabel')}
            placeholderTextColor={muted}
            style={[styles.anchorInput, { color: text, borderColor: border, backgroundColor: background }]}
            editable={!busy}
          />
          {stop.schedule?.arriveAt ? (
            <IconBtn
              icon="schedule"
              label={t('planAnchorPinArrive')}
              tint={tint}
              border={border}
              disabled={busy}
              onPress={pinArrive}
            />
          ) : null}
          {stop.anchorTime ? (
            <IconBtn
              icon="highlight-off"
              label={t('planResolveClearAnchor')}
              tint={muted}
              border={border}
              disabled={busy}
              onPress={clearAnchor}
            />
          ) : null}
        </View>
        <Text style={[styles.hint, { color: muted }]}>{t('planAnchorHint')}</Text>
      </CompactCard>
      </View>

      <View
        onLayout={(e) => {
          fieldOffsets.current.note = e.nativeEvent.layout.y;
        }}>
      <CompactCard title={t('planStopNote')} border={border} muted={muted}>
        <BottomSheetTextInput
          value={noteDraft}
          onChangeText={setNoteDraft}
          onFocus={() => onFieldFocus('note')}
          onBlur={saveNoteDraft}
          placeholder={t('planStopNotePlaceholder')}
          placeholderTextColor={muted}
          multiline
          textAlignVertical="top"
          style={[styles.noteInput, { color: text, borderColor: border, backgroundColor: background }]}
          editable={!busy}
        />
      </CompactCard>
      </View>

      <View
        onLayout={(e) => {
          fieldOffsets.current.cost = e.nativeEvent.layout.y;
        }}>
      <CompactCard title={t('planStopCost')} border={border} muted={muted}>
        <PlanStopCostEditor
          items={stop.costItems ?? []}
          currency={stop.estimatedCostCurrency}
          disabled={busy}
          onChange={saveCostItems}
          onFieldFocus={() => onFieldFocus('cost')}
        />
      </CompactCard>
      </View>

      {showTravel ? (
        <CompactCard title={t('planSectionTravel')} border={border} muted={muted}>
          <View style={styles.splitRow}>
            <LabeledStepper
              label={t('planTravelEdit')}
              muted={muted}
              stepper={
                <PlanMinuteStepper
                  compact
                  icon="directions"
                  value={travelMinutes ?? 1}
                  min={1}
                  unknown={travelMinutes == null}
                  disabled={busy}
                  accessibilityValueLabel={
                    travelMinutes == null
                      ? t('planSetTravel')
                      : t('planTravelMinutes', { minutes: travelMinutes })
                  }
                  onChange={(minutes) =>
                    applyPatch({ travelFromPrevSeconds: travelMinutesToSeconds(minutes) })
                  }
                />
              }
            />
            <LabeledStepper
              label={t('planBufferEdit')}
              muted={muted}
              stepper={
                <PlanMinuteStepper
                  compact
                  icon="schedule"
                  value={bufferMinutes}
                  min={0}
                  disabled={busy || !prevStop}
                  accessibilityValueLabel={t('planBufferMinutes', { minutes: bufferMinutes })}
                  onChange={(minutes) => {
                    if (!prevStop) return;
                    applyPatch(
                      { bufferAfterMinutes: clampBufferMinutes(minutes) },
                      { stopId: prevStop.id },
                    );
                  }}
                />
              }
            />
          </View>
          <View style={styles.iconRow}>
            {MODES.map((mode) => {
              const active = stop.travelModeOverride === mode.value;
              const label = mode.value ? t(MODE_KEY[mode.value]) : t('planTravelModeDefault');
              return (
                <Pressable
                  key={mode.value ?? 'default'}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                  disabled={busy}
                  onPress={() => setMode(mode.value)}
                  style={[
                    styles.iconChip,
                    {
                      borderColor: active ? tint : border,
                      backgroundColor: active ? `${tint}18` : background,
                    },
                  ]}>
                  <MaterialIcons name={mode.icon} size={18} color={active ? tint : text} />
                </Pressable>
              );
            })}
          </View>
        </CompactCard>
      ) : null}

      <CompactCard title={t('planStopSectionClassify')} border={border} muted={muted}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              { borderColor: border, backgroundColor: `${tint}12` },
            ]}>
            <MaterialIcons name={statusMeta.icon} size={16} color={tint} />
            <Text style={[styles.statusLabel, { color: text }]}>{t(statusMeta.key)}</Text>
          </View>
          <Text style={[styles.hint, { color: muted, flex: 1 }]}>{t('planStopStatusAuto')}</Text>
        </View>
        <View style={styles.iconRow}>
          <ToggleChip
            active={stop.tags.includes('accommodation')}
            label={t('planTagAccommodation')}
            icon="hotel"
            tint={tint}
            border={border}
            text={text}
            disabled={busy}
            onPress={() => toggleTag('accommodation')}
          />
        </View>
      </CompactCard>

      <View style={styles.dayRow}>
        <Text style={[styles.dayLabel, { color: muted }]}>{t('planPickDay')}</Text>
        <View style={styles.dayChips}>
          {days.map((day) => (
            <DayChip
              key={day.id}
              active={stop.tripDayId === day.id}
              label={t('planDayChip', { day: day.dayIndex + 1 })}
              tint={tint}
              border={border}
              text={text}
              disabled={busy}
              onPress={() => changeDay(day)}
            />
          ))}
          <DayChip
            active={stop.tripDayId == null}
            label={t('planIdeaBucket')}
            icon="lightbulb-outline"
            tint={tint}
            border={border}
            text={text}
            disabled={busy}
            onPress={() => changeDay(null)}
          />
        </View>
      </View>

      {error ? <Text style={[styles.error, { color: danger }]}>{error}</Text> : null}
    </BottomSheetScrollView>
  );
}

function CompactCard({
  title,
  border,
  muted,
  children,
}: {
  title: string;
  border: string;
  muted: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.card, { borderColor: border }]}>
      <Text style={[styles.cardTitle, { color: muted }]}>{title}</Text>
      {children}
    </View>
  );
}

function InfoPill({
  icon,
  label,
  value,
  tint,
  text,
  muted,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  tint: string;
  text: string;
  muted: string;
}) {
  return (
    <View style={styles.infoPill}>
      <MaterialIcons name={icon} size={14} color={tint} />
      <View style={styles.infoText}>
        <Text style={[styles.infoCaption, { color: muted }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function LabeledStepper({
  label,
  muted,
  stepper,
}: {
  label: string;
  muted: string;
  stepper: ReactNode;
}) {
  return (
    <View style={styles.labeledStepper}>
      <Text style={[styles.fieldCaption, { color: muted }]} numberOfLines={1}>
        {label}
      </Text>
      {stepper}
    </View>
  );
}

function IconBtn({
  icon,
  label,
  tint,
  border,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  tint: string;
  border: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconBtn, { borderColor: border, opacity: disabled ? 0.4 : 1 }]}>
      <MaterialIcons name={icon} size={16} color={tint} />
    </Pressable>
  );
}

function ToggleChip({
  active,
  label,
  icon,
  tint,
  border,
  text,
  disabled,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tint: string;
  border: string;
  text: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.toggleChip,
        {
          borderColor: active ? tint : border,
          backgroundColor: active ? `${tint}18` : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <MaterialIcons name={icon} size={14} color={active ? tint : text} />
      <Text style={[styles.toggleChipText, { color: active ? tint : text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function DayChip({
  active,
  label,
  icon,
  tint,
  border,
  text,
  disabled,
  onPress,
}: {
  active: boolean;
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  tint: string;
  border: string;
  text: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.dayChip,
        {
          borderColor: active ? tint : border,
          backgroundColor: active ? `${tint}18` : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      {icon ? <MaterialIcons name={icon} size={12} color={active ? tint : text} /> : null}
      <Text style={[styles.dayChipText, { color: active ? tint : text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, gap: 8 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 2,
  },
  topBarEnd: {
    justifyContent: 'flex-end',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  address: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  departChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  iconHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 100,
  },
  infoText: { flex: 1, gap: 0 },
  infoCaption: { fontSize: 10, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  durationCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 140,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    height: 32,
  },
  miniChipText: { fontSize: 11, fontWeight: '700' },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anchorInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
  },
  noteInput: {
    minHeight: 72,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  costInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 28,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labeledStepper: {
    flex: 1,
    minWidth: 120,
    gap: 4,
  },
  fieldCaption: {
    fontSize: 10,
    fontWeight: '600',
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
    maxWidth: '48%',
    flexGrow: 1,
  },
  toggleChipText: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  dayRow: {
    gap: 6,
    paddingHorizontal: 2,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 28,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  error: {
    fontSize: 12,
    paddingHorizontal: 2,
  },
});

/** @deprecated Use PlanStopSettingsPanel inside PlanTimeline. */
export const PlanStopDetailSheet = PlanStopSettingsPanel;
