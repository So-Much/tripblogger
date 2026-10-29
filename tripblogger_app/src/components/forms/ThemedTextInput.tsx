import { forwardRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

type ThemedTextInputProps = TextInputProps;

export const ThemedTextInput = forwardRef<TextInput, ThemedTextInputProps>(function ThemedTextInput(
  { style, placeholderTextColor, ...rest },
  ref,
) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? muted}
      style={[styles.input, { borderColor: border, backgroundColor: card, color: text }, style]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
});
