import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useI18n } from '@/src/i18n';

export function ProductTypeBadge({ type }: { type: 'NEW' | 'SECONDHAND' }) {
  const { t } = useI18n();
  const isNew = type === 'NEW';
  return (
    <View style={[styles.badge, { backgroundColor: isNew ? '#16653422' : '#c2410c22' }]}>
      <ThemedText style={[styles.txt, { color: isNew ? '#166534' : '#c2410c' }]}>
        {isNew ? t('productNew') : t('productSecondhand')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  txt: { fontSize: 11, fontWeight: '600' },
});
