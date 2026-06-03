import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { DirectionsAppIcon } from '@/src/components/trips/DirectionsAppIcon';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';

type DirectionsPickerSheetProps = {
  visible: boolean;
  destName?: string;
  showAppleMaps: boolean;
  onClose: () => void;
  onInApp: () => void;
  onGoogle: () => void;
  onApple: () => void;
};

export function DirectionsPickerSheet({
  visible,
  destName,
  showAppleMaps,
  onClose,
  onInApp,
  onGoogle,
  onApple,
}: DirectionsPickerSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');

  const options = [
    { key: 'inApp' as const, label: t('tripDirectionsInApp'), app: 'tripblogger' as const, onPress: onInApp },
    { key: 'google' as const, label: t('tripDirectionsGoogle'), app: 'google' as const, onPress: onGoogle },
    ...(showAppleMaps
      ? [{ key: 'apple' as const, label: t('tripDirectionsApple'), app: 'apple' as const, onPress: onApple }]
      : []),
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: card, borderColor: border, paddingBottom: Math.max(insets.bottom, 16) },
        ]}>
        <View style={[styles.handle, { backgroundColor: muted }]} />
        <ThemedText type="subtitle">{t('tripDirectionsPickTitle')}</ThemedText>
        {destName ? (
          <ThemedText style={{ color: muted, fontSize: 13 }} numberOfLines={1}>
            {destName}
          </ThemedText>
        ) : null}

        {options.map((option) => (
          <PressableScale
            key={option.key}
            style={[styles.row, { borderColor: border }]}
            onPress={option.onPress}>
            <DirectionsAppIcon app={option.app} size={32} />
            <ThemedText type="defaultSemiBold" style={styles.rowLabel}>
              {option.label}
            </ThemedText>
          </PressableScale>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowLabel: { flex: 1, fontSize: 16 },
});
