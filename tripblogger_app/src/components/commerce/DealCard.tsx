import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CommerceDeal } from '@/src/types/commerce';

interface DealCardProps {
  deal: CommerceDeal;
}

function DealCardInner({ deal }: DealCardProps) {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const cta = useThemeColor({}, 'cta');
  const muted = useThemeColor({}, 'textMuted');
  const surface = useThemeColor({}, 'surface');

  return (
    <Pressable
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: card, borderColor: border },
        pressed && styles.cardPressed,
      ]}>
      <View style={[styles.mediaWrap, { backgroundColor: surface }]}>
        {deal.imageUrl ? (
          <Image source={{ uri: deal.imageUrl }} style={styles.cover} contentFit="cover" cachePolicy="disk" />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}
        <View style={[styles.badgePill, { borderColor: border, backgroundColor: card }]}>
          <ThemedText style={[styles.badgeText, { color: cta }]} numberOfLines={1}>
            {deal.badge}
          </ThemedText>
        </View>
      </View>
      <View style={styles.body}>
        <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.title}>
          {deal.title}
        </ThemedText>
        <ThemedText style={[styles.shop, { color: muted }]} numberOfLines={1}>
          {deal.shopName}
        </ThemedText>
        <View style={styles.footer}>
          <ThemedText type="defaultSemiBold" style={styles.price}>
            {deal.priceLabel}
          </ThemedText>
          <ThemedText style={[styles.sold, { color: muted }]} numberOfLines={1}>
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
    borderRadius: 14,
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
    left: 8,
    top: 8,
    maxWidth: '88%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 4,
  },
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
  },
  sold: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
  },
});
