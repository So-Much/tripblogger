import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useI18n } from '@/src/i18n';

export function PromoBanner() {
  const router = useRouter();
  const { t } = useI18n();
  const cta = useThemeColor({}, 'cta');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <Pressable
      onPress={() => router.push('/(tabs)/shop')}
      style={[styles.wrap, { borderColor: cta, backgroundColor: card }]}
    >
      <View style={[styles.iconWrap, { borderColor: cta }]}>
        <IconSymbol size={22} name="bolt.fill" color={cta} />
      </View>
      <View style={styles.textCol}>
        <ThemedText type="defaultSemiBold">{t('homePromoTitle')}</ThemedText>
        <ThemedText style={{ color: muted, marginTop: 2 }}>{t('homePromoSubtitle')}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
});
