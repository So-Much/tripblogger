import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/friendly-commerce';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { CommerceDeal } from '@/src/types/commerce';

interface DealCardProps {
  deal: CommerceDeal;
  onPress?: () => void;
}

function DealCardInner({ deal, onPress }: DealCardProps) {
  const { card, border, cta, textMuted, primary, radius, space } = useCommerceTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`${deal.title}. ${deal.priceLabel}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: card,
          borderColor: border,
          borderRadius: radius.lg,
        },
        pressed && styles.cardPressed,
      ]}>
      <View style={[styles.mediaWrap, { backgroundColor: withAlpha(primary, 0.35) }]}>
        {deal.imageUrl ? (
          <Image source={{ uri: deal.imageUrl }} style={styles.cover} contentFit="cover" cachePolicy="disk" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}
        <View style={[styles.badgePill, { backgroundColor: withAlpha(cta, 0.92), borderRadius: radius.sm }]}>
          <ThemedText style={styles.badgeText} numberOfLines={1}>
            {deal.badge}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.body, { paddingHorizontal: space.md, paddingTop: 10, paddingBottom: space.md, gap: space.xs }]}>
        <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.title}>
          {deal.title}
        </ThemedText>
        <ThemedText style={[styles.shop, { color: textMuted }]} numberOfLines={1}>
          {deal.shopName}
        </ThemedText>
        <View style={styles.footer}>
          <ThemedText type="defaultSemiBold" style={[styles.price, { color: cta }]}>
            {deal.priceLabel}
          </ThemedText>
          <ThemedText style={[styles.sold, { color: textMuted }]} numberOfLines={1}>
            {deal.soldLabel}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

export const DealCard = memo(DealCardInner);

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    width: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.99 }],
  },
  mediaWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1.15,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    opacity: 0.35,
  },
  badgePill: {
    position: 'absolute',
    top: 8,
    left: 8,
    maxWidth: '80%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  body: {},
  title: {
    lineHeight: 20,
  },
  shop: {
    fontSize: 13,
  },
  footer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  price: {
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
    fontSize: 16,
  },
  sold: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
});
