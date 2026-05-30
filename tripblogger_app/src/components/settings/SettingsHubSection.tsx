import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { SectionCard } from '@/src/components/SectionCard';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';

const FROM_SETTINGS = '?from=settings';

type HubTile = {
  href: Href;
  titleKey:
    | 'settingsHubOrders'
    | 'settingsHubMyProducts'
    | 'settingsHubAddresses'
    | 'settingsHubCart'
    | 'settingsHubWishlist'
    | 'settingsHubSellerVerify'
    | 'settingsHubMyPosts'
    | 'settingsHubMyTrips';
  icon: IconSymbolName;
};

type HubGroup = {
  sectionTitleKey: 'settingsHubGroupShopping' | 'settingsHubGroupSelling' | 'settingsHubGroupContent';
  items: HubTile[];
};

const HUB_GROUPS: HubGroup[] = [
  {
    sectionTitleKey: 'settingsHubGroupShopping',
    items: [
      { href: `/(tabs)/shop/orders${FROM_SETTINGS}` as Href, titleKey: 'settingsHubOrders', icon: 'bag.fill' },
      { href: `/(tabs)/shop/cart${FROM_SETTINGS}` as Href, titleKey: 'settingsHubCart', icon: 'cart.fill' },
      { href: `/(tabs)/shop/wishlist${FROM_SETTINGS}` as Href, titleKey: 'settingsHubWishlist', icon: 'heart.fill' },
      { href: `/(tabs)/shop/addresses${FROM_SETTINGS}` as Href, titleKey: 'settingsHubAddresses', icon: 'mappin.circle.fill' },
    ],
  },
  {
    sectionTitleKey: 'settingsHubGroupSelling',
    items: [
      { href: `/(tabs)/shop/my-products${FROM_SETTINGS}` as Href, titleKey: 'settingsHubMyProducts', icon: 'storefront.fill' },
      { href: `/(tabs)/shop/seller-verify${FROM_SETTINGS}` as Href, titleKey: 'settingsHubSellerVerify', icon: 'checkmark.seal.fill' },
    ],
  },
  {
    sectionTitleKey: 'settingsHubGroupContent',
    items: [
      { href: '/(tabs)/posts' as Href, titleKey: 'settingsHubMyPosts', icon: 'doc.text.fill' },
      { href: `/(tabs)/trips/my${FROM_SETTINGS}` as Href, titleKey: 'settingsHubMyTrips', icon: 'location.fill' },
    ],
  },
];

const TILE_GAP = 8;
const MIN_TILE = 68;
const MAX_TILE = 92;

export function SettingsHubSection() {
  const { t } = useI18n();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');

  const horizontalPadding = 32;
  const usable = Math.max(windowWidth - horizontalPadding, 200);
  const columns = Math.min(4, Math.max(3, Math.floor(usable / (MIN_TILE + TILE_GAP))));
  const tileWidth = Math.min(MAX_TILE, Math.floor((usable - TILE_GAP * (columns - 1)) / columns));

  return (
    <View style={styles.groups}>
      {HUB_GROUPS.map((group) => (
        <SectionCard key={group.sectionTitleKey}>
          <ThemedText style={[styles.groupLabel, { color: muted }]}>{t(group.sectionTitleKey)}</ThemedText>
          <View style={[styles.grid, { gap: TILE_GAP }]}>
            {group.items.map((tile) => (
              <PressableScale
                key={tile.href as string}
                onPress={() => router.push(tile.href)}
                style={[
                  styles.tile,
                  {
                    width: tileWidth,
                    borderColor: border,
                    backgroundColor: surface,
                  },
                ]}
                hitSlop={4}>
                <IconSymbol name={tile.icon} size={20} color={tint} />
                <ThemedText style={styles.tileTitle} numberOfLines={2}>
                  {t(tile.titleKey)}
                </ThemedText>
              </PressableScale>
            ))}
          </View>
        </SectionCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  groups: { gap: 10 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 6,
  },
  tileTitle: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});
