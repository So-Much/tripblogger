import { forwardRef, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import { useI18n } from '@/src/i18n';

const CLEAR_PAD = 40;

type ClearButtonProps = {
  compact?: boolean;
  onPress: () => void;
  onTouchStart?: () => void;
};

/** Trailing X; shown by callers only when the field has text. */
export function InputClearButton({ compact, onPress, onTouchStart }: ClearButtonProps) {
  const { t } = useI18n();
  const muted = useThemeColor({}, 'textMuted');
  const icon = compact ? 16 : 18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('planCreateClearField')}
      focusable={false}
      onPress={onPress}
      onTouchStart={onTouchStart}
      hitSlop={compact ? 6 : 4}
      style={[styles.clearBtn, compact ? styles.clearBtnCompact : styles.clearBtnField]}>
      <MaterialIcons name="cancel" size={icon} color={muted} />
    </Pressable>
  );
}

type Props = TextInputProps;

/** Themed text field with a trailing clear control when non-empty. */
export const ClearableTextInput = forwardRef<TextInput, Props>(function ClearableTextInput(
  { value, onChangeText, style, ...rest },
  ref,
) {
  const innerRef = useRef<TextInput | null>(null);
  const showClear = typeof value === 'string' && value.length > 0;

  const setRef = (node: TextInput | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const clear = () => {
    onChangeText?.('');
    innerRef.current?.focus();
  };

  return (
    <View collapsable={false}>
      <ThemedTextInput
        ref={setRef}
        value={value}
        onChangeText={onChangeText}
        style={[showClear ? styles.inputPad : null, style]}
        {...rest}
      />
      {showClear ? (
        <InputClearButton
          onTouchStart={() => innerRef.current?.focus()}
          onPress={clear}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  inputPad: { paddingRight: CLEAR_PAD },
  clearBtn: {
    position: 'absolute',
    right: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  clearBtnField: {
    top: 0,
    bottom: 0,
    width: 36,
  },
  clearBtnCompact: {
    top: 0,
    bottom: 0,
    width: 32,
  },
});
