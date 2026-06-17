import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ProductList } from '@/src/components/commerce/ProductList';
import { ShopCategoryStrip } from '@/src/components/commerce/ShopCategoryStrip';
import {
  ShopFilterSheet,
  countActiveFilters,
  type ShopFilterValues,
} from '@/src/components/commerce/ShopFilterSheet';
import { ShopSearchToolbar } from '@/src/components/commerce/ShopSearchToolbar';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useProductQuickActions } from '@/src/hooks/use-product-quick-actions';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { ProductDto } from '@/src/types/commerce';

const headerHitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

const DEFAULT_FILTERS: ShopFilterValues = { sortBy: 'newest', productType: undefined };

export function ShopScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const meQuery = useMeQuery();
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const onCta = useThemeColor({}, 'onCta');
  const muted = useThemeColor({}, 'textMuted');

  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [filters, setFilters] = useState<ShopFilterValues>(DEFAULT_FILTERS);
  const [filterDraft, setFilterDraft] = useState<ShopFilterValues>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const isMember = meQuery.data?.role === 'MEMBER';
  const currentUserId = meQuery.data?.id ?? null;

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const requireMember = useCallback(() => {
    Alert.alert(t('tabShop'), t('shopMemberRequired'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('login'), onPress: () => router.push('/login') },
    ]);
  }, [router, t]);

  const quickActions = useProductQuickActions({ onRequireMember: requireMember });

  const categoriesQuery = useQuery({
    queryKey: ['commerce', 'categories'],
    queryFn: () => commerceService.listCategories(),
  });

  const wishlistIdsQuery = useQuery({
    queryKey: ['commerce', 'wishlist', 'ids'],
    queryFn: async () => {
      const res = await commerceService.listWishlist({ limit: 100 });
      return new Set(res.items.map((p) => p.id));
    },
    enabled: isMember,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const productsQuery = useInfiniteQuery({
    queryKey: ['commerce', 'products', 'public', categoryId, filters.productType, filters.sortBy, searchQuery],
    queryFn: ({ pageParam }) =>
      commerceService.listPublicProducts({
        limit: 20,
        cursor: pageParam as string | undefined,
        categoryId,
        productType: filters.productType,
        sortBy: filters.sortBy,
        search: searchQuery.length >= 2 ? searchQuery : undefined,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    maxPages: 5,
  });

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
  const total = productsQuery.data?.pages[0]?.total ?? items.length;
  const activeFilterCount = countActiveFilters(filters);

  const cartQtyByProductId = useMemo(() => {
    const m = new Map<string, number>();
    for (const line of cartCountQuery.data?.items ?? []) {
      m.set(line.productId, (m.get(line.productId) ?? 0) + line.quantity);
    }
    return m;
  }, [cartCountQuery.data?.items]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t('tabShop'),
      headerRight: () => (
        <View style={styles.headerRow}>
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
              <View style={[styles.cartBadge, { backgroundColor: danger }]}>
                <ThemedText style={styles.cartBadgeTxt}>
                  {(cartCountQuery.data?.itemCount ?? 0) > 99 ? '99+' : String(cartCountQuery.data?.itemCount)}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, tint, danger, t, isMember, cartCountQuery.data?.itemCount]);

  const onEndReached = useCallback(() => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      void productsQuery.fetchNextPage();
    }
  }, [productsQuery]);

  const onProductAction = useCallback(
    (action: 'cart' | 'buy' | 'wish', product: ProductDto) => {
      quickActions.run(action, product.id, isMember);
    },
    [isMember, quickActions],
  );

  const listHeader = (
    <>
      <ShopSearchToolbar
        query={searchInput}
        onChangeQuery={setSearchInput}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => {
          setFilterDraft(filters);
          setFilterOpen(true);
        }}
      />
      <ShopCategoryStrip
        categories={categoriesQuery.data ?? []}
        selectedId={categoryId}
        onSelect={setCategoryId}
        isLoading={categoriesQuery.isLoading}
      />
      <ThemedText style={[styles.resultCount, { color: muted }]}>
        {t('shopResultCount', { count: total })}
      </ThemedText>
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
            <ThemedText style={[styles.btnPrimaryTxt, { color: onCta }]}>{t('productCreate')}</ThemedText>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.loginPromptCard, { borderColor: border, backgroundColor: card }]}>
          <ThemedText style={[styles.hint, { color: muted }]}>{t('shopSellMemberRequired')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            style={[styles.btn, styles.btnPrimary, { backgroundColor: tint }]}
            onPress={() => router.push('/login')}>
            <ThemedText style={[styles.btnPrimaryTxt, { color: onCta }]}>{t('login')}</ThemedText>
          </Pressable>
        </View>
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
          onBuyNow={(p) => onProductAction('buy', p)}
          onAddToCart={(p) => onProductAction('cart', p)}
          onToggleWishlist={(p) => onProductAction('wish', p)}
          wishlistedIds={wishlistIdsQuery.data}
          cartQtyByProductId={isMember ? cartQtyByProductId : undefined}
          actionsDisabled={!isMember}
          pendingProductId={quickActions.pending?.productId ?? null}
          pendingAction={quickActions.pending?.action ?? null}
          currentUserId={currentUserId}
          ListHeaderComponent={listHeader}
          emptyLabel={productsQuery.isError ? t('productEmpty') : t('productEmpty')}
        />
      </ThemedView>

      <ShopFilterSheet
        visible={filterOpen}
        draft={filterDraft}
        onChange={setFilterDraft}
        onClose={() => setFilterOpen(false)}
        onReset={() => setFilterDraft(DEFAULT_FILTERS)}
        onApply={() => {
          setFilters(filterDraft);
          setFilterOpen(false);
        }}
      />
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
  cartBadgeTxt: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  resultCount: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },
  verifyBanner: { marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  btnGhost: {},
  btnPrimary: { borderWidth: 0 },
  btnPrimaryTxt: { fontWeight: '700', fontSize: 14 },
  hint: { paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  loginPromptCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
});
