import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { CommerceDeal } from '@/src/types/commerce';
import { DealCard } from './DealCard';

interface CommerceWidgetRowProps {
  deals: CommerceDeal[];
  /** Opens full shop / marketplace (e.g. expo-router push). */
  onSeeAllPress?: () => void;
  onDealPress?: (productId: string) => void;
}

export function CommerceWidgetRow({ deals, onSeeAllPress, onDealPress }: CommerceWidgetRowProps) {
  const { t } = useI18n();
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');

  return (
    <View style={[styles.shell, { borderColor: border, backgroundColor: card }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.kicker, { backgroundColor: `${cta}18` }]}>
            <IconSymbol name="cart.fill" size={14} color={cta} />
            <ThemedText style={[styles.kickerText, { color: cta }]}>{t('homeCommerceKicker')}</ThemedText>
          </View>
          <ThemedText type="subtitle" style={[styles.title, { color: text }]}>
            {t('homeCommerceTitle')}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: muted }]}>
            {t('homeCommerceSubtitle')}
          </ThemedText>
        </View>
        {onSeeAllPress ? (
          <Pressable
            hitSlop={10}
            onPress={onSeeAllPress}
            style={({ pressed }) => [styles.seeAll, pressed && { opacity: 0.75 }]}>
            <ThemedText type="defaultSemiBold" style={{ color: cta }}>
              {t('homeCommerceSeeAll')}
            </ThemedText>
            <IconSymbol name="chevron.right" size={14} color={cta} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onPress={onDealPress ? () => onDealPress(deal.id) : undefined} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  kicker: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  kickerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 22,
  },
  row: {
    gap: 12,
    paddingHorizontal: 14,
    paddingRight: 6,
  },
});
