import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/friendly-commerce';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { useI18n } from '@/src/i18n';

export function ProductTypeBadge({ type }: { type: 'NEW' | 'SECONDHAND' }) {
  const { t } = useI18n();
  const { secondary, success, warning, radius } = useCommerceTheme();
  const isNew = type === 'NEW';
  const bg = isNew ? withAlpha(secondary, 0.85) : withAlpha(warning, 0.15);
  const fg = isNew ? success : warning;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderRadius: radius.sm }]}>
      <ThemedText style={[styles.txt, { color: fg }]}>{isNew ? t('productNew') : t('productSecondhand')}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 4 },
  txt: { fontSize: 11, fontWeight: '600' },
});
