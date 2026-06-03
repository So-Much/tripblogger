import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';

type DirectionsLoadingOverlayProps = {
  visible: boolean;
};

export function DirectionsLoadingOverlay({ visible }: DirectionsLoadingOverlayProps) {
  const { t } = useI18n();
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <View style={[styles.card, { backgroundColor: `${card}F2` }]}>
        <ActivityIndicator color={tint} size="large" />
        <ThemedText type="defaultSemiBold">{t('tripDirectionsLoading')}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 12,
  },
});
