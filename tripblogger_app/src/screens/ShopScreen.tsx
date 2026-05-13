import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { CategoryDto, ProductDto } from '@/src/types/commerce';
import { formatApiError } from '@/src/utils/format-api-error';
import { CategoryChip } from '@/src/components/commerce/CategoryChip';
import { ProductCard } from '@/src/components/commerce/ProductCard';

const headerHitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

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

  const categoriesQuery = useQuery({
    queryKey: ['commerce', 'categories'],
    queryFn: () => commerceService.listCategories(),
  });

  const productsQuery = useInfiniteQuery({
    queryKey: ['commerce', 'products', 'public', categoryId],
    queryFn: ({ pageParam }) =>
      commerceService.listPublicProducts({
        limit: 20,
        cursor: pageParam as string | undefined,
        categoryId,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const isMember = meQuery.data?.role === 'MEMBER';

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

  const renderItem = useCallback(
    ({ item }: { item: ProductDto }) => (
      <View style={{ width: '50%', paddingHorizontal: 4 }}>
        <ProductCard
          product={item}
          onPress={() => router.push(`/(tabs)/shop/${item.id}` as Href)}
          borderColor={border}
          cardColor={card}
          tint={tint}
        />
      </View>
    ),
    [router, border, card, tint],
  );

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ThemedView style={styles.flex}>
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
        {isMember ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('productMyProductsA11y')}
              style={[styles.btn, styles.btnGhost, { borderColor: border }]}
              onPress={() => router.push('/(tabs)/shop/my-products')}>
              <ThemedText type="link">{t('productMyProducts')}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('productCreateA11y')}
              style={[styles.btn, styles.btnPrimary, { backgroundColor: tint }]}
              onPress={() => router.push('/(tabs)/shop/create')}>
              <ThemedText style={styles.btnPrimaryTxt}>{t('productCreate')}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ordersTitleA11y')}
              style={[styles.btn, styles.btnGhost, { borderColor: border }]}
              onPress={() => router.push('/(tabs)/shop/orders')}>
              <ThemedText type="link">{t('ordersTitle')}</ThemedText>
            </Pressable>
          </View>
        ) : (
          <ThemedText style={[styles.hint, { color: muted }]}>{t('shopSellMemberRequired')}</ThemedText>
        )}
        {productsQuery.isError ? (
          <ThemedText style={styles.center}>{formatApiError(productsQuery.error, t('productEmpty'))}</ThemedText>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          renderItem={renderItem}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={productsQuery.isRefetching} onRefresh={() => void productsQuery.refetch()} />
          }
          ListFooterComponent={
            productsQuery.isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            productsQuery.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
              <ThemedText style={[styles.center, { color: muted }]}>{t('productEmpty')}</ThemedText>
            )
          }
          contentContainerStyle={styles.list}
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, marginBottom: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  btnGhost: {},
  btnPrimary: { borderWidth: 0 },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { paddingHorizontal: 12, marginBottom: 8, fontSize: 13 },
  list: { paddingHorizontal: 8, paddingBottom: 24 },
  center: { textAlign: 'center', marginTop: 24, paddingHorizontal: 16 },
});
