import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import { useI18n } from '@/src/i18n';
import { formatApiError } from '@/src/utils/format-api-error';
import { useCreateTripMutation } from '../hooks/useTripMutations';
import type { PlanTravelMode, TripDetailDto } from '../types/plan';

/** Matches TripBottomNav bar height above safe-area padding. */
const NAV_BAR_OFFSET = 56;

const MODES: PlanTravelMode[] = ['motorbike', 'car', 'foot', 'bike'];

const MODE_KEY: Record<PlanTravelMode, 'planModeMotorbike' | 'planModeCar' | 'planModeFoot' | 'planModeBike'> = {
  motorbike: 'planModeMotorbike',
  car: 'planModeCar',
  foot: 'planModeFoot',
  bike: 'planModeBike',
};

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultRange() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

type Props = {
  onCreated: (trip: TripDetailDto) => void;
};

/** Empty-state create form when the member has no trips yet. */
export function PlanEmptyCreate({ onCreated }: Props) {
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
  const defaults = useMemo(() => defaultRange(), []);

  const [title, setTitle] = useState('Đà Lạt 3 ngày');
  const [destinationLabel, setDestinationLabel] = useState('Đà Lạt');
  const [destinationLat, setDestinationLat] = useState('11.9404');
  const [destinationLng, setDestinationLng] = useState('108.4583');
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [defaultTravelMode, setDefaultTravelMode] = useState<PlanTravelMode>('motorbike');
  const [defaultDayStartTime, setDefaultDayStartTime] = useState('08:00');
  const [localError, setLocalError] = useState<string | null>(null);

  const bottom = Math.max(insets.bottom, 8) + NAV_BAR_OFFSET + 12;

  const submit = () => {
    setLocalError(null);
    const lat = Number(destinationLat);
    const lng = Number(destinationLng);
    if (!title.trim() || !destinationLabel.trim()) {
      setLocalError(t('planCreateValidation'));
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLocalError(t('planCreateValidation'));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      setLocalError(t('planCreateValidation'));
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(defaultDayStartTime)) {
      setLocalError(t('planCreateValidation'));
      return;
    }
    if (endDate < startDate) {
      setLocalError(t('planCreateValidation'));
      return;
    }

    createTrip.mutate(
      {
        title: title.trim(),
        destinationLabel: destinationLabel.trim(),
        destinationLat: lat,
        destinationLng: lng,
        startDate,
        endDate,
        defaultTravelMode,
        defaultDayStartTime,
      },
      {
        onSuccess: (trip) => onCreated(trip),
        onError: (err) => setLocalError(formatApiError(err, t('planCreateFailed'))),
      },
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: bottom, paddingTop: insets.top + 56 }]}>
      <View style={[styles.panel, { backgroundColor: surface, borderColor: border }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: text }]}>{t('planEmptyTitle')}</Text>
          <Text style={[styles.body, { color: muted }]}>{t('planEmptyBody')}</Text>
          <Text style={[styles.section, { color: text }]}>{t('planCreateTitle')}</Text>

          <FieldLabel color={muted}>{t('planCreateFieldTitle')}</FieldLabel>
          <ThemedTextInput value={title} onChangeText={setTitle} autoCapitalize="sentences" />

          <FieldLabel color={muted}>{t('planCreateDestination')}</FieldLabel>
          <ThemedTextInput
            value={destinationLabel}
            onChangeText={setDestinationLabel}
            autoCapitalize="words"
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <FieldLabel color={muted}>{t('planCreateLat')}</FieldLabel>
              <ThemedTextInput
                value={destinationLat}
                onChangeText={setDestinationLat}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.half}>
              <FieldLabel color={muted}>{t('planCreateLng')}</FieldLabel>
              <ThemedTextInput
                value={destinationLng}
                onChangeText={setDestinationLng}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <FieldLabel color={muted}>{t('planCreateStartDate')}</FieldLabel>
              <ThemedTextInput
                value={startDate}
                onChangeText={setStartDate}
                autoCapitalize="none"
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.half}>
              <FieldLabel color={muted}>{t('planCreateEndDate')}</FieldLabel>
              <ThemedTextInput
                value={endDate}
                onChangeText={setEndDate}
                autoCapitalize="none"
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <FieldLabel color={muted}>{t('planCreateMode')}</FieldLabel>
          <View style={styles.modes}>
            {MODES.map((mode) => {
              const active = mode === defaultTravelMode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setDefaultTravelMode(mode)}
                  style={[
                    styles.modeChip,
                    {
                      borderColor: active ? tint : border,
                      backgroundColor: active ? `${tint}18` : 'transparent',
                    },
                  ]}>
                  <Text style={{ color: active ? tint : muted, fontWeight: '600', fontSize: 13 }}>
                    {t(MODE_KEY[mode])}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FieldLabel color={muted}>{t('planCreateDayStart')}</FieldLabel>
          <ThemedTextInput
            value={defaultDayStartTime}
            onChangeText={setDefaultDayStartTime}
            autoCapitalize="none"
            placeholder="HH:mm"
          />

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
        </ScrollView>
      </View>
    </View>
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    zIndex: 30,
    elevation: 30,
  },
  panel: {
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20, marginBottom: 4 },
  section: { fontSize: 15, fontWeight: '700', marginTop: 6 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, gap: 8 },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  error: { fontSize: 13, marginTop: 4 },
  cta: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
