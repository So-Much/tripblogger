import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

type ComposerBottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
};

export function ComposerBottomSheet({ visible, title, onClose, children, footer, contentStyle }: ComposerBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            { borderColor: border, backgroundColor: card, paddingBottom: Math.max(insets.bottom, 16) },
          ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: muted }]} />
          </View>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={{ color: text }}>
              {title}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <IconSymbol name="xmark.circle.fill" size={24} color={muted} />
            </Pressable>
          </View>
          <View style={[styles.body, contentStyle]}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(2,6,23,0.45)' },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '82%',
  },
  handleRow: { alignItems: 'center', paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 999 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  body: { paddingHorizontal: 16, paddingTop: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 8 },
});
