import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CategoryChip } from '@/src/components/commerce/CategoryChip';
import { ProductList } from '@/src/components/commerce/ProductList';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { CategoryDto } from '@/src/types/commerce';

const headerHitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

type SortBy = 'newest' | 'price_asc' | 'price_desc' | 'popular';

export function ShopScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const meQuery = useMeQuery();
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'textMuted');

  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [productType, setProductType] = useState<'NEW' | 'SECONDHAND' | undefined>();
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  const categoriesQuery = useQuery({
    queryKey: ['commerce', 'categories'],
    queryFn: () => commerceService.listCategories(),
  });

  const productsQuery = useInfiniteQuery({
    queryKey: ['commerce', 'products', 'public', categoryId, productType, sortBy],
    queryFn: ({ pageParam }) =>
      commerceService.listPublicProducts({
        limit: 20,
        cursor: pageParam as string | undefined,
        categoryId,
        productType,
        sortBy,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    maxPages: 5,
  });

  const isMember = meQuery.data?.role === 'MEMBER';

  const verifyQ = useQuery({
    queryKey: ['commerce', 'seller-verification'],
    queryFn: () => commerceService.getVerificationStatus(),
    enabled: isMember,
  });
  const isVerifiedSeller = verifyQ.data?.status === 'APPROVED';

  const cartCountQuery = useQuery({
    queryKey: ['commerce', 'cart'],
    queryFn: () => commerceService.getCart(),
    enabled: isMember,
    staleTime: 30_000,
  });

  const items = useMemo(() => productsQuery.data?.pages.flatMap((p) => p.items) ?? [], [productsQuery.data?.pages]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t('tabShop'),
      headerRight: () => (
        <View style={styles.headerRow}>
          <Pressable
            hitSlop={headerHitSlop}
            accessibilityRole="button"
            accessibilityLabel={t('shopSearch')}
            onPress={() => router.push('/(tabs)/shop/search')}>
            <IconSymbol name="magnifyingglass" size={22} color={tint} />
          </Pressable>
          <Pressable
            hitSlop={headerHitSlop}
            accessibilityRole="button"
            accessibilityLabel={t('wishlistTitle')}
            onPress={() => router.push('/(tabs)/shop/wishlist')}
            style={styles.hdrPad}>
            <IconSymbol name="heart.fill" size={22} color={tint} />
          </Pressable>
          <Pressable
            hitSlop={headerHitSlop}
            accessibilityRole="button"
            accessibilityLabel={
              isMember && (cartCountQuery.data?.itemCount ?? 0) > 0
                ? t('cartBadgeA11y', { count: cartCountQuery.data?.itemCount ?? 0 })
                : t('cartTitle')
            }
            onPress={() => router.push('/(tabs)/shop/cart')}
            style={styles.cartWrap}>
            <IconSymbol name="cart.fill" size={22} color={tint} />
            {isMember && (cartCountQuery.data?.itemCount ?? 0) > 0 ? (
              <View style={[styles.cartBadge, { backgroundColor: tint }]}>
                <ThemedText style={styles.cartBadgeTxt}>
                  {(cartCountQuery.data?.itemCount ?? 0) > 99 ? '99+' : String(cartCountQuery.data?.itemCount)}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, tint, t, isMember, cartCountQuery.data?.itemCount]);

  const onEndReached = useCallback(() => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      void productsQuery.fetchNextPage();
    }
  }, [productsQuery]);

  const listHeader = (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
        <CategoryChip
          label={t('shopAllProducts')}
          selected={!categoryId}
          onPress={() => setCategoryId(undefined)}
          borderColor={border}
          tint={tint}
        />
        {(categoriesQuery.data ?? []).map((c: CategoryDto) => (
          <CategoryChip
            key={c.id}
            label={c.name}
            selected={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
            borderColor={border}
            tint={tint}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['newest', 'popular', 'price_asc', 'price_desc'] as SortBy[]).map((s) => (
          <CategoryChip
            key={s}
            label={t(`shopSort_${s}`)}
            selected={sortBy === s}
            onPress={() => setSortBy(s)}
            borderColor={border}
            tint={tint}
          />
        ))}
        <CategoryChip
          label={t('productNew')}
          selected={productType === 'NEW'}
          onPress={() => setProductType(productType === 'NEW' ? undefined : 'NEW')}
          borderColor={border}
          tint={tint}
        />
        <CategoryChip
          label={t('productSecondhand')}
          selected={productType === 'SECONDHAND'}
          onPress={() => setProductType(productType === 'SECONDHAND' ? undefined : 'SECONDHAND')}
          borderColor={border}
          tint={tint}
        />
      </ScrollView>
      {isMember && !isVerifiedSeller ? (
        <Pressable
          style={[styles.verifyBanner, { borderColor: border, backgroundColor: card }]}
          onPress={() => router.push('/(tabs)/shop/seller-verify')}>
          <ThemedText type="defaultSemiBold">{t('sellerVerifyBanner')}</ThemedText>
          <ThemedText style={{ color: muted, fontSize: 13 }}>{t('sellerVerifyBannerHint')}</ThemedText>
        </Pressable>
      ) : null}
      {isMember ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            style={[styles.btn, styles.btnGhost, { borderColor: border }]}
            onPress={() => router.push('/(tabs)/shop/my-products')}>
            <ThemedText type="link">{t('productMyProducts')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.btn, styles.btnPrimary, { backgroundColor: tint }]}
            onPress={() =>
              isVerifiedSeller ? router.push('/(tabs)/shop/create') : router.push('/(tabs)/shop/seller-verify')
            }>
            <ThemedText style={styles.btnPrimaryTxt}>{t('productCreate')}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.btn, styles.btnGhost, { borderColor: border }]}
            onPress={() => router.push('/(tabs)/shop/orders')}>
            <ThemedText type="link">{t('ordersTitle')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <ThemedText style={[styles.hint, { color: muted }]}>{t('shopSellMemberRequired')}</ThemedText>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ThemedView style={styles.flex}>
        <ProductList
          items={items}
          isLoading={productsQuery.isLoading}
          isRefetching={productsQuery.isRefetching}
          isFetchingNextPage={productsQuery.isFetchingNextPage}
          hasNextPage={Boolean(productsQuery.hasNextPage)}
          onRefresh={() => void productsQuery.refetch()}
          onEndReached={onEndReached}
          onPressProduct={(id) => router.push(`/(tabs)/shop/${id}` as Href)}
          ListHeaderComponent={listHeader}
          emptyLabel={productsQuery.isError ? t('productEmpty') : t('productEmpty')}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 8 },
  hdrPad: { paddingHorizontal: 4 },
  cartWrap: { position: 'relative' },
  cartBadge: {
    position: 'absolute',
    right: -6,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  catRow: { maxHeight: 44, paddingHorizontal: 12, marginBottom: 8 },
  filterRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  verifyBanner: { marginHorizontal: 12, marginBottom: 10, padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, marginBottom: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  btnGhost: {},
  btnPrimary: { borderWidth: 0 },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { paddingHorizontal: 12, marginBottom: 8, fontSize: 13 },
});
