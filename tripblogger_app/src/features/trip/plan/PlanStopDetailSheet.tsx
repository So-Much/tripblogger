import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { formatApiError } from '@/src/utils/format-api-error';
import { tripKeys } from '../hooks/trip-query-keys';
import {
  useDeleteStopMutation,
  useMoveStopMutation,
  usePatchStopMutation,
} from '../hooks/useTripMutations';
import type {
  PatchStopDto,
  PlanTravelMode,
  StopPriority,
  StopStatus,
  TripDayDto,
  TripDetailDto,
  TripStopDto,
} from '../types/plan';
import {
  applyLocalStopPatch,
  clockFromIso,
  patchAffectsLocalSchedule,
} from './applyLocalDaySchedule';

const DURATION_STEP = 15;
const STAY_LONGER = 30;

const MODES: (PlanTravelMode | null)[] = [null, 'motorbike', 'car', 'foot', 'bike'];

const MODE_KEY: Record<
  PlanTravelMode,
  'planModeMotorbike' | 'planModeCar' | 'planModeFoot' | 'planModeBike'
> = {
  motorbike: 'planModeMotorbike',
  car: 'planModeCar',
  foot: 'planModeFoot',
  bike: 'planModeBike',
};

const STATUS_OPTS: { value: StopStatus; key: TranslationKey }[] = [
  { value: 'todo', key: 'planStatusTodo' },
  { value: 'doing', key: 'planStatusDoing' },
  { value: 'done', key: 'planStatusDone' },
  { value: 'skipped', key: 'planStatusSkipped' },
];

type Props = {
  visible: boolean;
  tripId: string;
  trip: TripDetailDto | null;
  stop: TripStopDto | null;
  onClose: () => void;
};

/**
 * Full stop editor: stay longer, duration, anchor, tags, priority, status,
 * travel mode override, change day, delete.
 */
export function PlanStopDetailSheet({ visible, tripId, trip, stop, onClose }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const patchStop = usePatchStopMutation();
  const deleteStop = useDeleteStopMutation();
  const moveStop = useMoveStopMutation();

  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const [anchorDraft, setAnchorDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && stop) {
      setAnchorDraft(stop.anchorTime ?? '');
      setError(null);
    }
  }, [visible, stop]);

  const days = useMemo(() => trip?.days ?? [], [trip?.days]);
  const busy = patchStop.isPending || deleteStop.isPending || moveStop.isPending;

  if (!stop) return null;

  const applyPatch = (dto: PatchStopDto, opts?: { close?: boolean }) => {
    setError(null);
    if (patchAffectsLocalSchedule(dto)) {
      queryClient.setQueryData<TripDetailDto>(tripKeys.detail(tripId), (old) =>
        old ? applyLocalStopPatch(old, stop.id, dto) : old,
      );
    } else if (dto.tags !== undefined || dto.priority !== undefined || dto.travelModeOverride !== undefined) {
      queryClient.setQueryData<TripDetailDto>(tripKeys.detail(tripId), (old) =>
        old ? applyLocalStopPatch(old, stop.id, dto) : old,
      );
    }
    patchStop.mutate(
      { tripId, stopId: stop.id, dto },
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

  const stayLonger = () => {
    applyPatch({ durationMinutes: stop.durationMinutes + STAY_LONGER });
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

  const setStatus = (status: StopStatus) => {
    if (status === stop.status) return;
    applyPatch({ status });
  };

  const toggleTag = (tag: 'entry_point' | 'accommodation') => {
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

  const confirmDelete = () => {
    Alert.alert(t('planDeleteStop'), stop.name, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('planDeleteStop'),
        style: 'destructive',
        onPress: () => {
          deleteStop.mutate(
            { tripId, stopId: stop.id },
            {
              onSuccess: () => onClose(),
              onError: (err) => setError(formatApiError(err, t('errorTitle'))),
            },
          );
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: surface,
            borderColor: border,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: muted }]} />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: text }]} numberOfLines={2}>
            {stop.name}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: muted, fontWeight: '600' }}>{t('close')}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <Pressable
            disabled={busy}
            onPress={stayLonger}
            style={[styles.primaryBtn, { backgroundColor: cta }]}>
            {patchStop.isPending ? (
              <ActivityIndicator color={onCta} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: onCta }]}>{t('planStayLonger')}</Text>
            )}
          </Pressable>

          <SectionLabel color={muted}>{t('planDuration')}</SectionLabel>
          <View style={styles.row}>
            <StepperBtn
              label={`−${DURATION_STEP}`}
              border={border}
              text={text}
              disabled={busy || stop.durationMinutes <= DURATION_STEP}
              onPress={() => bumpDuration(-DURATION_STEP)}
            />
            <Text style={[styles.durationValue, { color: text }]}>{stop.durationMinutes}′</Text>
            <StepperBtn
              label={`+${DURATION_STEP}`}
              border={border}
              text={text}
              disabled={busy}
              onPress={() => bumpDuration(DURATION_STEP)}
            />
          </View>

          <SectionLabel color={muted}>{t('planAnchorLabel')}</SectionLabel>
          <View style={styles.row}>
            <TextInput
              value={anchorDraft}
              onChangeText={setAnchorDraft}
              placeholder="HH:mm"
              placeholderTextColor={muted}
              style={[styles.input, { color: text, borderColor: border }]}
              editable={!busy}
            />
            <Pressable
              disabled={busy}
              onPress={saveAnchorDraft}
              style={[styles.smallBtn, { borderColor: tint }]}>
              <Text style={{ color: tint, fontWeight: '700' }}>{t('save')}</Text>
            </Pressable>
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <Pressable
              disabled={busy || !stop.schedule?.arriveAt}
              onPress={pinArrive}
              style={[styles.chip, { borderColor: border }]}>
              <Text style={{ color: text, fontSize: 13 }}>{t('planAnchorPinArrive')}</Text>
            </Pressable>
            {stop.anchorTime ? (
              <Pressable
                disabled={busy}
                onPress={clearAnchor}
                style={[styles.chip, { borderColor: border }]}>
                <Text style={{ color: muted, fontSize: 13 }}>{t('planResolveClearAnchor')}</Text>
              </Pressable>
            ) : null}
          </View>

          <SectionLabel color={muted}>{`${t('planPriorityMust')} / ${t('planPriorityNice')}`}</SectionLabel>
          <View style={styles.row}>
            {(['must', 'nice'] as const).map((p) => (
              <ChoiceChip
                key={p}
                active={stop.priority === p}
                label={t(p === 'must' ? 'planPriorityMust' : 'planPriorityNice')}
                tint={tint}
                border={border}
                text={text}
                disabled={busy}
                onPress={() => setPriority(p)}
              />
            ))}
          </View>

          <SectionLabel color={muted}>{t('planStatusTodo')}</SectionLabel>
          <View style={styles.wrap}>
            {STATUS_OPTS.map((s) => (
              <ChoiceChip
                key={s.value}
                active={stop.status === s.value}
                label={t(s.key)}
                tint={tint}
                border={border}
                text={text}
                disabled={busy}
                onPress={() => setStatus(s.value)}
              />
            ))}
          </View>

          <SectionLabel color={muted}>{t('planTagEntryPoint')}</SectionLabel>
          <View style={styles.row}>
            <ChoiceChip
              active={stop.tags.includes('entry_point')}
              label={t('planTagEntryPoint')}
              tint={tint}
              border={border}
              text={text}
              disabled={busy}
              onPress={() => toggleTag('entry_point')}
            />
            <ChoiceChip
              active={stop.tags.includes('accommodation')}
              label={t('planTagAccommodation')}
              tint={tint}
              border={border}
              text={text}
              disabled={busy}
              onPress={() => toggleTag('accommodation')}
            />
          </View>

          <SectionLabel color={muted}>{t('planTravelModeOverride')}</SectionLabel>
          <View style={styles.wrap}>
            {MODES.map((mode) => (
              <ChoiceChip
                key={mode ?? 'default'}
                active={stop.travelModeOverride === mode}
                label={mode ? t(MODE_KEY[mode]) : t('planTravelModeDefault')}
                tint={tint}
                border={border}
                text={text}
                disabled={busy}
                onPress={() => setMode(mode)}
              />
            ))}
          </View>

          <SectionLabel color={muted}>{t('planPickDay')}</SectionLabel>
          <View style={styles.wrap}>
            {days.map((day) => (
              <ChoiceChip
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
            <ChoiceChip
              active={stop.tripDayId == null}
              label={t('planIdeaBucket')}
              tint={tint}
              border={border}
              text={text}
              disabled={busy}
              onPress={() => changeDay(null)}
            />
          </View>

          {error ? <Text style={{ color: danger, marginTop: 8 }}>{error}</Text> : null}

          <Pressable
            disabled={busy}
            onPress={confirmDelete}
            style={[styles.deleteBtn, { borderColor: danger }]}>
            {deleteStop.isPending ? (
              <ActivityIndicator color={danger} />
            ) : (
              <Text style={{ color: danger, fontWeight: '700' }}>{t('planDeleteStop')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SectionLabel({ color, children }: { color: string; children: string }) {
  return <Text style={[styles.section, { color }]}>{children}</Text>;
}

function StepperBtn({
  label,
  border,
  text,
  disabled,
  onPress,
}: {
  label: string;
  border: string;
  text: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepper, { borderColor: border, opacity: disabled ? 0.4 : 1 }]}>
      <Text style={{ color: text, fontWeight: '700', fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

function ChoiceChip({
  active,
  label,
  tint,
  border,
  text,
  disabled,
  onPress,
}: {
  active: boolean;
  label: string;
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
        styles.chip,
        {
          borderColor: active ? tint : border,
          backgroundColor: active ? `${tint}18` : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <Text style={{ color: active ? tint : text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryBtnText: { fontWeight: '700', fontSize: 15 },
  section: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationValue: { fontSize: 18, fontWeight: '700', minWidth: 56, textAlign: 'center' },
  stepper: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  smallBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtn: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
