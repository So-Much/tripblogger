import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
};

const HIT = 44;

/**
 * Compact +/− minutes control. Visual chip stays small; press targets are 44px.
 * No press-scale (avoids itinerary layout shift).
 */
export function PlanMinuteStepper({
  value,
  min,
  onChange,
  disabled,
  unknown,
  icon,
  accessibilityValueLabel,
}: Props) {
  const { t } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const surface = useThemeColor({}, 'surface');
  const tint = useThemeColor({}, 'tint');

  const atMin = unknown || value <= min;

  return (
    <View style={[styles.wrap, { borderColor: border, backgroundColor: surface }]}>
      {icon ? <MaterialIcons name={icon} size={16} color={tint} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('planDecreaseMinutes')}
        disabled={disabled || atMin}
        onPress={() => onChange(Math.max(min, value - 1))}
        style={[styles.hit, { opacity: disabled || atMin ? 0.35 : 1 }]}>
        <MaterialIcons name="remove" size={18} color={text} />
      </Pressable>
      <Text
        accessibilityLabel={accessibilityValueLabel}
        style={[styles.value, { color: unknown ? muted : text }]}>
        {unknown ? '—' : `${value}′`}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('planIncreaseMinutes')}
        disabled={disabled}
        onPress={() => onChange(unknown ? Math.max(min, 1) : value + 1)}
        style={[styles.hit, { opacity: disabled ? 0.35 : 1 }]}>
        <MaterialIcons name="add" size={18} color={text} />
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
  hit: {
    width: HIT,
    height: HIT,
    marginVertical: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
