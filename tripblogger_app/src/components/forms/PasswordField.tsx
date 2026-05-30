import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { ThemedTextInput } from './ThemedTextInput';

type PasswordFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  autoComplete?: 'password' | 'password-new';
};

export function PasswordField({
  value,
  onChangeText,
  placeholder = '••••••••',
  accessibilityLabel = 'Password',
  autoComplete = 'password',
}: PasswordFieldProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const muted = useThemeColor({}, 'textMuted');

  return (
    <View style={styles.wrap}>
      <ThemedTextInput
        accessibilityLabel={accessibilityLabel}
        secureTextEntry={!visible}
        autoComplete={autoComplete}
        textContentType={autoComplete === 'password-new' ? 'newPassword' : 'password'}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
      <Pressable
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visible ? t('hidePassword') : t('showPassword')}>
        <IconSymbol name={visible ? 'eye.slash.fill' : 'eye.fill'} size={20} color={muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  input: { paddingRight: 48 },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
});
