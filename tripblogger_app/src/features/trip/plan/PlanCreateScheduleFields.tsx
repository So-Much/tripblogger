import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import {
  combineLocalDateTime,
  endDateFromTripDays,
  formatDateRangeDisplay,
  formatIsoDateTimeDisplay,
  formatTripDaysNights,
  splitLocalDateTime,
} from './plan-create-dates';

/** iOS: one datetime spinner. Android: date then time in the same tap flow. */
type PickerPhase = 'datetime' | 'android-date' | 'android-time' | null;

export type PlanCreateScheduleFieldsProps = {
  startDate: string;
  tripDays: number;
  defaultDayStartTime: string;
  onStartDateChange: (iso: string) => void;
  onTripDaysChange: (days: number) => void;
  onDayStartTimeChange: (hhmm: string) => void;
};

export function PlanCreateScheduleFields({
  startDate,
  tripDays,
  defaultDayStartTime,
  onStartDateChange,
  onTripDaysChange,
  onDayStartTimeChange,
}: PlanCreateScheduleFieldsProps) {
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const card = useThemeColor({}, 'card');

  const [picker, setPicker] = useState<PickerPhase>(null);
  const timePickerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftDateTime, setDraftDateTime] = useState(() =>
    combineLocalDateTime(startDate, defaultDayStartTime),
  );
  const [daysDraft, setDaysDraft] = useState(String(tripDays));
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  const endDate = endDateFromTripDays(startDate, tripDays);
  const startDateTime = combineLocalDateTime(startDate, defaultDayStartTime);

  useEffect(() => {
    setDaysDraft(String(tripDays));
  }, [tripDays]);

  useEffect(() => {
    return () => {
      if (timePickerTimerRef.current) clearTimeout(timePickerTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (picker == null) {
      setDraftDateTime(combineLocalDateTime(startDate, defaultDayStartTime));
    }
  }, [startDate, defaultDayStartTime, picker]);

  const applyDays = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    setDaysDraft(digits);
    if (!digits) return;
    const n = Number.parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 1) return;
    onTripDaysChange(Math.min(n, 365));
  };

  const closePicker = () => setPicker(null);

  const applyDateTime = (date: Date) => {
    const split = splitLocalDateTime(date);
    onStartDateChange(split.startDate);
    onDayStartTimeChange(split.defaultDayStartTime);
  };

  const openStartPicker = () => {
    setDraftDateTime(combineLocalDateTime(startDate, defaultDayStartTime));
    setPicker(Platform.OS === 'android' ? 'android-date' : 'datetime');
  };

  const onNativeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        closePicker();
        return;
      }
      if (!date) {
        closePicker();
        return;
      }
      if (picker === 'android-date') {
        const withTime = combineLocalDateTime(
          splitLocalDateTime(date).startDate,
          defaultDayStartTime,
        );
        setDraftDateTime(withTime);
        // Android dismisses the date dialog; open time in the same tap flow.
        setPicker(null);
        timePickerTimerRef.current = setTimeout(() => setPicker('android-time'), 50);
        return;
      }
      if (picker === 'android-time') {
        const merged = combineLocalDateTime(
          splitLocalDateTime(draftDateTime).startDate,
          splitLocalDateTime(date).defaultDayStartTime,
        );
        applyDateTime(merged);
        closePicker();
        return;
      }
      closePicker();
      return;
    }

    if (!date) return;
    setDraftDateTime(date);
    applyDateTime(date);
  };

  const pickerValue =
    picker === 'android-time' || picker === 'android-date' || picker === 'datetime'
      ? draftDateTime
      : startDateTime;

  const pickerMode =
    picker === 'android-time' ? 'time' : picker === 'android-date' ? 'date' : 'datetime';

  const startDisplay = formatIsoDateTimeDisplay(startDate, defaultDayStartTime, locale);
  const daysNightsLabel = formatTripDaysNights(tripDays, locale);

  const nativePicker =
    picker != null ? (
      <DateTimePicker
        value={pickerValue}
        mode={pickerMode}
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        themeVariant={colorScheme}
        textColor={text}
        accentColor={tint}
        locale={locale}
        is24Hour
        onChange={onNativeChange}
      />
    ) : null;

  const bumpDays = (delta: number) => {
    onTripDaysChange(Math.min(365, Math.max(1, tripDays + delta)));
  };

  return (
    <View style={styles.root}>
      <Text style={[styles.label, { color: muted }]}>{t('planCreateDates')}</Text>

      <View style={styles.scheduleRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('planCreateStartDateTime')}, ${startDisplay}. ${t('planCreateDayStartHint')}`}
          onPress={openStartPicker}
          style={[styles.dateTimeField, { borderColor: border, backgroundColor: card }]}>
          <View style={styles.dateTimeCopy}>
            <Text style={[styles.dateBtnLabel, { color: muted }]} numberOfLines={1}>
              {t('planCreateDayStartHint')}
            </Text>
            <Text style={[styles.dateBtnValue, { color: text }]} numberOfLines={1}>
              {startDisplay}
            </Text>
          </View>
          <MaterialIcons name="event" size={20} color={muted} />
        </Pressable>

        <View style={[styles.daysPanel, { borderColor: border, backgroundColor: card }]}>
          <Text style={[styles.dateBtnLabel, { color: muted }]} numberOfLines={2}>
            {daysNightsLabel}
          </Text>
          <View style={styles.daysControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('planCreateTripDays')} −`}
              onPress={() => bumpDays(-1)}
              hitSlop={10}
              style={[styles.stepBtn, { borderColor: border }]}>
              <MaterialIcons name="remove" size={16} color={muted} />
            </Pressable>
            <TextInput
              value={daysDraft}
              onChangeText={applyDays}
              onBlur={() => {
                if (!daysDraft || Number.parseInt(daysDraft, 10) < 1) {
                  setDaysDraft(String(Math.max(1, tripDays)));
                }
              }}
              keyboardType="number-pad"
              placeholder={t('planCreateTripDaysPlaceholder')}
              placeholderTextColor={muted}
              accessibilityLabel={`${t('planCreateTripDays')}, ${daysNightsLabel}`}
              maxLength={3}
              underlineColorAndroid="transparent"
              style={[styles.daysInput, { color: text }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('planCreateTripDays')} +`}
              onPress={() => bumpDays(1)}
              hitSlop={10}
              style={[styles.stepBtn, { borderColor: border }]}>
              <MaterialIcons name="add" size={16} color={muted} />
            </Pressable>
          </View>
        </View>
      </View>

      <Text style={[styles.range, { color: text }]}>
        {formatDateRangeDisplay(startDate, endDate, locale)}
      </Text>

      {Platform.OS === 'android' && picker != null ? nativePicker : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={picker != null} transparent animationType="slide" onRequestClose={closePicker}>
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={closePicker}
              accessibilityRole="button"
              accessibilityLabel={t('close')}
            />
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: surface,
                  borderColor: border,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: text }]}>
                  {t('planCreateStartDateTime')}
                </Text>
                <Pressable
                  onPress={closePicker}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('postsSheetDone')}>
                  <Text style={{ color: tint, fontWeight: '700', fontSize: 16 }}>
                    {t('postsSheetDone')}
                  </Text>
                </Pressable>
              </View>
              {nativePicker}
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  dateTimeField: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 48,
  },
  dateTimeCopy: { flex: 1, minWidth: 0, gap: 2 },
  daysPanel: {
    width: 124,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
    justifyContent: 'center',
  },
  dateBtnLabel: { fontSize: 10, fontWeight: '600', lineHeight: 13 },
  dateBtnValue: { fontSize: 13, fontWeight: '700' },
  daysControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysInput: {
    flex: 1,
    minWidth: 32,
    minHeight: 28,
    paddingHorizontal: 2,
    paddingVertical: 2,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  range: { fontSize: 14, fontWeight: '600' },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
});
