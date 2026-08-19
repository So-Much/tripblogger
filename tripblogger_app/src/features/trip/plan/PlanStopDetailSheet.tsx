import {
  BottomSheetBackdrop,
  BottomSheetHandle,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
import { PlanMinuteStepper } from './PlanMinuteStepper';
import { planSheetSnapPoints } from './plan-sheet-layout';
import { planStopDeleteTarget } from './plan-stop-delete';
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

const STATUS_OPTS: {
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
  visible: boolean;
  tripId: string;
  trip: TripDetailDto | null;
  stop: TripStopDto | null;
  prevStop?: TripStopDto | null;
  onClose: () => void;
};

function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/T(\d{2}:\d{2})/);
  return m ? m[1] : '—';
}

/**
 * Stop settings: Gorhom snap-point sheet (drag handle to resize), not a static Modal.
 * Approach A fields only — name, time, stay, status, travel/buffer, day, tags.
 */
export function PlanStopDetailSheet({
  visible,
  tripId,
  trip,
  stop,
  prevStop = null,
  onClose,
}: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const patchStop = usePatchStopMutation();
  const deleteStop = useDeleteStopMutation();
  const moveStop = useMoveStopMutation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const stopRef = useRef(stop);
  if (stop) stopRef.current = stop;

  const surface = useThemeColor({}, 'surface');
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');
  const primary = useThemeColor({}, 'primary');

  const [anchorDraft, setAnchorDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const current = stop ?? stopRef.current;
  const snapPoints = useMemo(() => {
    const available = Math.max(180, windowHeight - insets.top - Math.max(insets.bottom, 8));
    return planSheetSnapPoints(available);
  }, [windowHeight, insets.top, insets.bottom]);

  useEffect(() => {
    if (visible && stop) {
      setAnchorDraft(stop.anchorTime ?? '');
      setError(null);
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible, stop]);

  const days = useMemo(() => trip?.days ?? [], [trip?.days]);
  const busy = patchStop.isPending || deleteStop.isPending || moveStop.isPending;
  const showTravel = current != null && current.tripDayId != null && prevStop != null;
  const travelMinutes = current ? formatTravelMinutes(current.travelFromPrevSeconds) : null;
  const bufferMinutes =
    prevStop != null ? (prevStop.bufferAfterMinutes ?? trip?.defaultBufferMinutes ?? 0) : 0;

  const applyPatch = (dto: PatchStopDto, opts?: { close?: boolean; stopId?: string }) => {
    if (!current) return;
    const targetId = opts?.stopId ?? current.id;
    setError(null);
    if (
      patchAffectsLocalSchedule(dto) ||
      dto.tags !== undefined ||
      dto.priority !== undefined ||
      dto.travelModeOverride !== undefined
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

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderHandle = useCallback(
    (handleProps: BottomSheetHandleProps) => (
      <BottomSheetHandle {...handleProps}>
        <View style={styles.handleCaption}>
          <Text style={[styles.handleHint, { color: muted }]}>{t('planStopEditorHint')}</Text>
        </View>
      </BottomSheetHandle>
    ),
    [muted, t],
  );

  if (!current) return null;

  const stayLonger = () => {
    applyPatch({ durationMinutes: current.durationMinutes + STAY_LONGER });
  };

  const bumpDuration = (delta: number) => {
    const next = Math.max(DURATION_STEP, current.durationMinutes + delta);
    if (next === current.durationMinutes) return;
    applyPatch({ durationMinutes: next });
  };

  const setPriority = (priority: StopPriority) => {
    if (priority === current.priority) return;
    applyPatch({ priority });
  };

  const setStatus = (status: StopStatus) => {
    if (status === current.status) return;
    applyPatch({ status });
  };

  const toggleTag = (tag: 'entry_point' | 'accommodation') => {
    const has = current.tags.includes(tag);
    const tags = has ? current.tags.filter((x) => x !== tag) : [...current.tags, tag];
    applyPatch({ tags });
  };

  const setMode = (mode: PlanTravelMode | null) => {
    if (mode === current.travelModeOverride) return;
    applyPatch({ travelModeOverride: mode });
  };

  const clearAnchor = () => {
    setAnchorDraft('');
    applyPatch({ anchorTime: null });
  };

  const pinArrive = () => {
    const clock = clockFromIso(current.schedule?.arriveAt);
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
    if (toTripDayId === current.tripDayId) return;
    setError(null);
    const toPosition = day
      ? day.stops.filter((s) => s.id !== current.id).length
      : (trip?.ideaStops.filter((s) => s.id !== current.id).length ?? 0);
    moveStop.mutate(
      { tripId, stopId: current.id, dto: { toTripDayId, toPosition } },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(formatApiError(err, t('errorTitle'))),
      },
    );
  };

  const confirmDelete = () => {
    const target = planStopDeleteTarget(current);
    Alert.alert(t(target.titleKey), target.message, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('planDeleteStop'),
        style: 'destructive',
        onPress: () => {
          deleteStop.mutate(
            { tripId, stopId: target.stopId },
            {
              onSuccess: () => onClose(),
              onError: (err) => setError(formatApiError(err, t('errorTitle'))),
            },
          );
        },
      },
    ]);
  };

  const arrive = formatClock(current.schedule?.arriveAt);
  const start = formatClock(current.schedule?.startAt);
  const timeLabel =
    current.schedule?.skipped || current.status === 'skipped'
      ? '—'
      : current.schedule?.arriveAt
        ? arrive
        : start;
  const timeCaption = current.schedule?.arriveAt ? t('planArriveAt') : t('planStartAt');
  const statusOpt = STATUS_OPTS.find((s) => s.value === current.status) ?? STATUS_OPTS[0];

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={1}
      snapPoints={snapPoints}
      topInset={insets.top}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableOverDrag={false}
      enableContentPanningGesture={false}
      enableHandlePanningGesture
      android_keyboardInputMode="adjustResize"
      onDismiss={onClose}
      stackBehavior="push"
      containerStyle={{ zIndex: 80, elevation: 80 }}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      backgroundStyle={{
        backgroundColor: surface,
        borderTopColor: border,
        borderTopWidth: StyleSheet.hairlineWidth,
      }}
      handleIndicatorStyle={{ backgroundColor: muted, width: 40 }}>
      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 24 },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View style={[styles.heroIcon, { backgroundColor: primary }]}>
            <MaterialIcons name="place" size={22} color={tint} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: text }]} numberOfLines={2}>
              {current.name}
            </Text>
            {current.address ? (
              <Text style={[styles.address, { color: muted }]} numberOfLines={2}>
                {current.address}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={onClose}
            style={styles.iconHit}>
            <MaterialIcons name="close" size={22} color={muted} />
          </Pressable>
        </View>

        <View style={[styles.metaRow, { backgroundColor: background, borderColor: border }]}>
          <MetaCell
            icon="schedule"
            caption={timeCaption}
            value={timeLabel}
            text={text}
            muted={muted}
            tint={tint}
          />
          <View style={[styles.metaSplit, { backgroundColor: border }]} />
          <MetaCell
            icon="hourglass-empty"
            caption={t('planDuration')}
            value={`${current.durationMinutes}′`}
            text={text}
            muted={muted}
            tint={tint}
          />
          <View style={[styles.metaSplit, { backgroundColor: border }]} />
          <MetaCell
            icon={statusOpt.icon}
            caption={t('planSectionStatus')}
            value={t(statusOpt.key)}
            text={text}
            muted={muted}
            tint={tint}
          />
        </View>

        <SectionLabel icon="hotel" color={muted}>
          {t('planSectionStay')}
        </SectionLabel>
        <Pressable
          disabled={busy}
          onPress={stayLonger}
          style={[styles.primaryBtn, { backgroundColor: cta }]}>
          {patchStop.isPending ? (
            <ActivityIndicator color={onCta} />
          ) : (
            <>
              <MaterialIcons name="more-time" size={20} color={onCta} />
              <Text style={[styles.primaryBtnText, { color: onCta }]}>{t('planStayLonger')}</Text>
            </>
          )}
        </Pressable>
        <View style={styles.row}>
          <StepperBtn
            icon="remove"
            border={border}
            text={text}
            disabled={busy || current.durationMinutes <= DURATION_STEP}
            onPress={() => bumpDuration(-DURATION_STEP)}
            label={`−${DURATION_STEP}`}
          />
          <Text style={[styles.durationValue, { color: text }]}>{current.durationMinutes}′</Text>
          <StepperBtn
            icon="add"
            border={border}
            text={text}
            disabled={busy}
            onPress={() => bumpDuration(DURATION_STEP)}
            label={`+${DURATION_STEP}`}
          />
        </View>

        <SectionLabel icon="event" color={muted}>
          {t('planSectionSchedule')}
        </SectionLabel>
        <Text style={[styles.fieldLabel, { color: muted }]}>{t('planAnchorLabel')}</Text>
        <View style={styles.row}>
          <TextInput
            value={anchorDraft}
            onChangeText={setAnchorDraft}
            placeholder="HH:mm"
            placeholderTextColor={muted}
            style={[styles.input, { color: text, borderColor: border, backgroundColor: background }]}
            editable={!busy}
          />
          <Pressable
            disabled={busy}
            onPress={saveAnchorDraft}
            style={[styles.iconHit, styles.outlineHit, { borderColor: tint }]}>
            <MaterialIcons name="save" size={20} color={tint} />
          </Pressable>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <ChoiceChip
            active={false}
            label={t('planAnchorPinArrive')}
            icon="push-pin"
            tint={tint}
            border={border}
            text={text}
            disabled={busy || !current.schedule?.arriveAt}
            onPress={pinArrive}
          />
          {current.anchorTime ? (
            <ChoiceChip
              active={false}
              label={t('planResolveClearAnchor')}
              icon="highlight-off"
              tint={tint}
              border={border}
              text={muted}
              disabled={busy}
              onPress={clearAnchor}
            />
          ) : null}
        </View>

        {showTravel ? (
          <>
            <SectionLabel icon="directions" color={muted}>
              {t('planSectionTravel')}
            </SectionLabel>
            <Text style={[styles.fieldLabel, { color: muted }]}>{t('planTravelEdit')}</Text>
            <PlanMinuteStepper
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
            <Text style={[styles.fieldLabel, { color: muted, marginTop: 10 }]}>
              {t('planBufferEdit')}
            </Text>
            <PlanMinuteStepper
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
          </>
        ) : null}

        <SectionLabel icon="flag" color={muted}>
          {`${t('planPriorityMust')} / ${t('planPriorityNice')}`}
        </SectionLabel>
        <View style={styles.row}>
          <ChoiceChip
            active={current.priority === 'must'}
            label={t('planPriorityMust')}
            icon="star"
            tint={tint}
            border={border}
            text={text}
            disabled={busy}
            onPress={() => setPriority('must')}
          />
          <ChoiceChip
            active={current.priority === 'nice'}
            label={t('planPriorityNice')}
            icon="star-border"
            tint={tint}
            border={border}
            text={text}
            disabled={busy}
            onPress={() => setPriority('nice')}
          />
        </View>

        <SectionLabel icon="task-alt" color={muted}>
          {t('planSectionStatus')}
        </SectionLabel>
        <View style={styles.wrap}>
          {STATUS_OPTS.map((s) => (
            <ChoiceChip
              key={s.value}
              active={current.status === s.value}
              label={t(s.key)}
              icon={s.icon}
              tint={tint}
              border={border}
              text={text}
              disabled={busy}
              onPress={() => setStatus(s.value)}
            />
          ))}
        </View>

        <SectionLabel icon="label-outline" color={muted}>
          {t('planTagEntryPoint')}
        </SectionLabel>
        <View style={styles.row}>
          <ChoiceChip
            active={current.tags.includes('entry_point')}
            label={t('planTagEntryPoint')}
            icon="login"
            tint={tint}
            border={border}
            text={text}
            disabled={busy}
            onPress={() => toggleTag('entry_point')}
          />
          <ChoiceChip
            active={current.tags.includes('accommodation')}
            label={t('planTagAccommodation')}
            icon="hotel"
            tint={tint}
            border={border}
            text={text}
            disabled={busy}
            onPress={() => toggleTag('accommodation')}
          />
        </View>

        <SectionLabel icon="commute" color={muted}>
          {t('planTravelModeOverride')}
        </SectionLabel>
        <View style={styles.wrap}>
          {MODES.map((mode) => (
            <ChoiceChip
              key={mode.value ?? 'default'}
              active={current.travelModeOverride === mode.value}
              label={mode.value ? t(MODE_KEY[mode.value]) : t('planTravelModeDefault')}
              icon={mode.icon}
              tint={tint}
              border={border}
              text={text}
              disabled={busy}
              onPress={() => setMode(mode.value)}
            />
          ))}
        </View>

        <SectionLabel icon="calendar-today" color={muted}>
          {t('planPickDay')}
        </SectionLabel>
        <View style={styles.wrap}>
          {days.map((day) => (
            <ChoiceChip
              key={day.id}
              active={current.tripDayId === day.id}
              label={t('planDayChip', { day: day.dayIndex + 1 })}
              tint={tint}
              border={border}
              text={text}
              disabled={busy}
              onPress={() => changeDay(day)}
            />
          ))}
          <ChoiceChip
            active={current.tripDayId == null}
            label={t('planIdeaBucket')}
            icon="lightbulb-outline"
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
            <>
              <MaterialIcons name="delete-outline" size={20} color={danger} />
              <Text style={{ color: danger, fontWeight: '700' }}>{t('planDeleteStop')}</Text>
            </>
          )}
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function SectionLabel({
  color,
  icon,
  children,
}: {
  color: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  children: string;
}) {
  return (
    <View style={styles.sectionRow}>
      <MaterialIcons name={icon} size={14} color={color} />
      <Text style={[styles.section, { color }]}>{children}</Text>
    </View>
  );
}

function MetaCell({
  icon,
  caption,
  value,
  text,
  muted,
  tint,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  caption: string;
  value: string;
  text: string;
  muted: string;
  tint: string;
}) {
  return (
    <View style={styles.metaCell}>
      <MaterialIcons name={icon} size={16} color={tint} />
      <Text style={[styles.metaCaption, { color: muted }]}>{caption}</Text>
      <Text style={[styles.metaValue, { color: text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function StepperBtn({
  icon,
  label,
  border,
  text,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  border: string;
  text: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[styles.stepper, { borderColor: border, opacity: disabled ? 0.4 : 1 }]}>
      <MaterialIcons name={icon} size={20} color={text} />
      <Text style={{ color: text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function ChoiceChip({
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
        styles.chip,
        {
          borderColor: active ? tint : border,
          backgroundColor: active ? `${tint}18` : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      {icon ? <MaterialIcons name={icon} size={16} color={active ? tint : text} /> : null}
      <Text style={{ color: active ? tint : text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  handleCaption: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  handleHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '700' },
  address: { fontSize: 12, lineHeight: 16 },
  iconHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineHit: {
    borderWidth: 1,
    borderRadius: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  metaCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
  },
  metaSplit: { width: StyleSheet.hairlineWidth },
  metaCaption: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  metaValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  primaryBtn: {
    borderRadius: 12,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  primaryBtnText: { fontWeight: '700', fontSize: 15 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
  },
  section: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationValue: { fontSize: 18, fontWeight: '700', minWidth: 56, textAlign: 'center' },
  stepper: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  chip: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteBtn: {
    marginTop: 24,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
