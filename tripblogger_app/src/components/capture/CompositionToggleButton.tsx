import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useI18n } from '@/src/i18n';

type Props = {
  visible: boolean;
  onToggle: () => void;
};

export function CompositionToggleButton({ visible, onToggle }: Props) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.btn, !visible && styles.btnDim]}
      accessibilityRole="button"
      accessibilityLabel={t('compositionToggleFrame')}>
      <IconSymbol name={visible ? 'square.grid.3x3' : 'square.grid.3x3.fill'} size={22} color="#F2F2F7" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,22,24,0.88)',
  },
  btnDim: { opacity: 0.65 },
});
