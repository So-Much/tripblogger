import { useEffect, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';

type Props = {
  value: number;
  min: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** When true, show an em dash instead of 0 (unknown travel). */
  unknown?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  accessibilityValueLabel: string;
  /** Tighter row for stop settings panel. */
  compact?: boolean;
  /** Allow typing minutes directly. */
  editable?: boolean;
  /** Use BottomSheetTextInput (inside gorhom sheet). */
  sheetAware?: boolean;
  onInputFocus?: () => void;
};

const HIT = 44;
const HIT_COMPACT = 36;

/**
 * Compact +/− minutes control. Optional text input for direct entry.
 */
export function PlanMinuteStepper({
  value,
  min,
  onChange,
  disabled,
  unknown,
  icon,
  accessibilityValueLabel,
  compact = false,
  editable = false,
  sheetAware = false,
  onInputFocus,
}: Props) {
  const { t } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const tint = useThemeColor({}, 'tint');

  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const atMin = unknown || value <= min;
  const hit = compact ? HIT_COMPACT : HIT;
  const Input = sheetAware ? BottomSheetTextInput : TextInput;

  const commitDraft = () => {
    const n = parseInt(draft.replace(/\D/g, ''), 10);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const next = Math.max(min, n);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        { borderColor: border, backgroundColor: surface },
      ]}>
      {icon ? <MaterialIcons name={icon} size={compact ? 14 : 16} color={tint} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('planDecreaseMinutes')}
        disabled={disabled || atMin}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[styles.hit, compact && styles.hitCompact, { opacity: disabled || atMin ? 0.35 : 1, width: hit, height: hit }]}>
        <MaterialIcons name="remove" size={compact ? 16 : 18} color={text} />
      </Pressable>
      {editable && !unknown ? (
        <Input
          accessibilityLabel={accessibilityValueLabel}
          value={draft}
          onChangeText={(v) => setDraft(v.replace(/\D/g, ''))}
          onFocus={onInputFocus}
          onBlur={commitDraft}
          onSubmitEditing={commitDraft}
          keyboardType="number-pad"
          editable={!disabled}
          selectTextOnFocus
          style={[styles.valueInput, compact && styles.valueInputCompact, { color: text }]}
        />
      ) : (
        <Text
          accessibilityLabel={accessibilityValueLabel}
          style={[styles.value, compact && styles.valueCompact, { color: unknown ? muted : text }]}>
          {unknown ? '—' : `${value}′`}
        </Text>
      )}
      {editable && !unknown ? (
        <Text style={[styles.unit, { color: muted }]}>′</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('planIncreaseMinutes')}
        disabled={disabled}
        onPress={() => onChange(unknown ? Math.max(min, 1) : value + 1)}
        style={[styles.hit, compact && styles.hitCompact, { opacity: disabled ? 0.35 : 1, width: hit, height: hit }]}>
        <MaterialIcons name="add" size={compact ? 16 : 18} color={text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingLeft: 8,
    height: 36,
  },
  wrapCompact: {
    height: 32,
    borderRadius: 8,
    paddingLeft: 6,
    flex: 1,
  },
  hit: {
    width: HIT,
    height: HIT,
    marginVertical: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitCompact: {
    marginVertical: -2,
  },
  value: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  valueCompact: {
    minWidth: 28,
    fontSize: 12,
  },
  valueInput: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  valueInputCompact: {
    minWidth: 28,
    fontSize: 12,
  },
  unit: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 2,
  },
});
