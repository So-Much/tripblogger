import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { formatApiError } from '@/src/utils/format-api-error';
import { useCreateTripMutation } from '../hooks/useTripMutations';
import type { CreateTripDto, PlanTravelMode, TripDetailDto } from '../types/plan';
import { ClearableTextInput } from './ClearableTextInput';
import { PlanCreateScheduleFields } from './PlanCreateScheduleFields';
import { PlanDestinationChips } from './PlanDestinationChips';
import { PlanOptionChips } from './PlanOptionChips';
import { endDateFromTripDays, isoDateLocal } from './plan-create-dates';
import { resolveTravelModeForDto } from './plan-create-option';
import {
  firstCatalogCoords,
  joinDestinationLabel,
  type DestinationChip,
} from './plan-create-destination';

/** Matches TripBottomNav bar height above safe-area padding. */
const NAV_BAR_OFFSET = 56;
/** Space below status bar for the map back + search row. */
const HEADER_CLEARANCE = 62;

const MODES: PlanTravelMode[] = ['motorbike', 'car', 'foot', 'bike'];

const MODE_KEY: Record<
  PlanTravelMode,
  'planModeMotorbike' | 'planModeCar' | 'planModeFoot' | 'planModeBike'
> = {
  motorbike: 'planModeMotorbike',
  car: 'planModeCar',
  foot: 'planModeFoot',
  bike: 'planModeBike',
};

type ArrivalMode = 'coach' | 'train' | 'plane' | 'self_drive';

const ARRIVAL_MODES: ArrivalMode[] = ['coach', 'train', 'plane', 'self_drive'];

const ARRIVAL_KEY: Record<
  ArrivalMode,
  | 'planCreateArrivalCoach'
  | 'planCreateArrivalTrain'
  | 'planCreateArrivalPlane'
  | 'planCreateArrivalSelfDrive'
> = {
  coach: 'planCreateArrivalCoach',
  train: 'planCreateArrivalTrain',
  plane: 'planCreateArrivalPlane',
  self_drive: 'planCreateArrivalSelfDrive',
};

type Props = {
  onCreated: (trip: TripDetailDto) => void;
  /** When set, form is an overlay to add another trip (not first-trip empty state). */
  onCancel?: () => void;
};

/** Create-trip form: empty state, or overlay when adding another trip. */
export function PlanEmptyCreate({ onCreated, onCancel }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');

  const createTrip = useCreateTripMutation();

  const [title, setTitle] = useState('Đà Lạt 3 ngày');
  const [chips, setChips] = useState<DestinationChip[]>([
    { id: 'init-dalat', kind: 'catalog', name: 'Đà Lạt', lat: 11.9404, lng: 108.4583 },
  ]);
  const [destNudge, setDestNudge] = useState<string | null>(null);
  const todayIso = useMemo(() => isoDateLocal(new Date()), []);
  const [startDate, setStartDate] = useState(todayIso);
  const [tripDays, setTripDays] = useState(3);
  const endDate = useMemo(
    () => endDateFromTripDays(startDate, tripDays),
    [startDate, tripDays],
  );
  const [defaultTravelMode, setDefaultTravelMode] = useState<PlanTravelMode>('motorbike');
  const [travelCustom, setTravelCustom] = useState<string | null>(null);
  const [travelCustomSelected, setTravelCustomSelected] = useState(false);
  const [defaultDayStartTime, setDefaultDayStartTime] = useState('08:00');
  const [arrivalMode, setArrivalMode] = useState<ArrivalMode | null>(null);
  const [arrivalCustom, setArrivalCustom] = useState<string | null>(null);
  const [arrivalCustomSelected, setArrivalCustomSelected] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const topPad = insets.top + HEADER_CLEARANCE;
  const tabBarBlock = Math.max(insets.bottom, 8) + NAV_BAR_OFFSET;

  const submit = () => {
    setLocalError(null);
    setDestNudge(null);
    const destinationLabel = joinDestinationLabel(chips).trim();
    const coords = firstCatalogCoords(chips);
    if (!title.trim()) {
      setLocalError(t('planCreateValidation'));
      return;
    }
    if (!coords || !destinationLabel) {
      setDestNudge(t('planCreateDestinationNeedCatalog'));
      setLocalError(t('planCreateValidation'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      setLocalError(t('planCreateValidation'));
      return;
    }
    if (endDate < startDate) {
      setLocalError(t('planCreateValidation'));
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(defaultDayStartTime)) {
      setLocalError(t('planCreateValidation'));
      return;
    }

    const dto: CreateTripDto = {
      title: title.trim(),
      destinationLabel,
      destinationLat: coords.lat,
      destinationLng: coords.lng,
      startDate,
      endDate,
      defaultTravelMode: resolveTravelModeForDto(defaultTravelMode),
      defaultDayStartTime,
    };
    // Explicitly do NOT include arrivalMode / arrivalCustom (UX-only state above).

    createTrip.mutate(dto, {
      onSuccess: (trip) => onCreated(trip),
      onError: (err) => setLocalError(formatApiError(err, t('planCreateFailed'))),
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? topPad : 0}
      style={[
        styles.wrap,
        {
          top: topPad,
          bottom: tabBarBlock,
        },
      ]}>
      <View style={[styles.panel, { backgroundColor: surface, borderColor: border }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: text, flex: 1 }]}>
              {onCancel ? t('planCreateTitle') : t('planEmptyTitle')}
            </Text>
            {onCancel ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('cancel')}
                onPress={onCancel}
                hitSlop={8}
                style={styles.cancelBtn}>
                <Text style={{ color: tint, fontWeight: '700', fontSize: 14 }}>{t('cancel')}</Text>
              </Pressable>
            ) : null}
          </View>
          {onCancel ? null : (
            <Text style={[styles.body, { color: muted }]}>{t('planEmptyBody')}</Text>
          )}
          {onCancel ? null : (
            <Text style={[styles.section, { color: text }]}>{t('planCreateTitle')}</Text>
          )}

          <FieldLabel color={muted}>{t('planCreateFieldTitle')}</FieldLabel>
          <ClearableTextInput
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            accessibilityLabel={t('planCreateFieldTitle')}
          />

          <PlanDestinationChips
            chips={chips}
            onChangeChips={setChips}
            nudge={destNudge}
            onNudge={setDestNudge}
          />

          <PlanCreateScheduleFields
            startDate={startDate}
            tripDays={tripDays}
            defaultDayStartTime={defaultDayStartTime}
            onStartDateChange={setStartDate}
            onTripDaysChange={setTripDays}
            onDayStartTimeChange={setDefaultDayStartTime}
          />

          <FieldLabel color={muted}>{t('planCreateArrivalMode')}</FieldLabel>
          <Text style={[styles.hint, { color: muted }]}>{t('planCreateArrivalModeHint')}</Text>
          <PlanOptionChips
            options={ARRIVAL_MODES.map((id) => ({ id, label: t(ARRIVAL_KEY[id]) }))}
            selectedId={arrivalMode}
            customLabel={arrivalCustom}
            customSelected={arrivalCustomSelected}
            onSelectKnown={(id) => {
              setArrivalMode((prev) => {
                if (arrivalCustomSelected) return id;
                return prev === id ? null : id;
              });
              setArrivalCustomSelected(false);
            }}
            onCommitCustom={(label) => {
              setArrivalCustom(label);
              setArrivalCustomSelected(true);
            }}
            onSelectCustom={() => {
              if (arrivalCustom) setArrivalCustomSelected(true);
            }}
            placeholder={t('planCreateOptionOther')}
            inputA11yLabel={t('planCreateOptionOther')}
          />

          <FieldLabel color={muted}>{t('planCreateMode')}</FieldLabel>
          <PlanOptionChips
            options={MODES.map((id) => ({ id, label: t(MODE_KEY[id]) }))}
            selectedId={defaultTravelMode}
            customLabel={travelCustom}
            customSelected={travelCustomSelected}
            onSelectKnown={(id) => {
              setDefaultTravelMode(id);
              setTravelCustomSelected(false);
            }}
            onCommitCustom={(label) => {
              setTravelCustom(label);
              setTravelCustomSelected(true);
            }}
            onSelectCustom={() => {
              if (travelCustom) setTravelCustomSelected(true);
            }}
            placeholder={t('planCreateOptionOther')}
            inputA11yLabel={t('planCreateOptionOther')}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: border, backgroundColor: surface }]}>
          {localError ? (
            <Text style={[styles.error, { color: danger }]}>{localError}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={createTrip.isPending}
            onPress={submit}
            style={[styles.cta, { backgroundColor: cta, opacity: createTrip.isPending ? 0.7 : 1 }]}>
            {createTrip.isPending ? (
              <ActivityIndicator color={onCta} />
            ) : (
              <Text style={[styles.ctaText, { color: onCta }]}>{t('planCreateCta')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({
  children,
  color,
}: {
  children: string;
  color: string;
}) {
  return <Text style={[styles.label, { color }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 35,
    elevation: 35,
  },
  panel: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 8,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  section: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 16, marginTop: -2 },
  error: { fontSize: 13 },
  cta: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
