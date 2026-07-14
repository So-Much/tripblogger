import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ProductCard } from '@/src/components/commerce/ProductCard';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useProductQuickActions } from '@/src/hooks/use-product-quick-actions';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { ProductDto } from '@/src/types/commerce';

export function ShopSearchScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState('');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const surface = useThemeColor({}, 'surface');
  const me = useMeQuery();
  const isMember = me.data?.role === 'MEMBER';
  const hasSession = Boolean(me.data);
  const userRole = me.data?.role;

  const requireMember = useCallback(() => {
    Alert.alert(t('tabShop'), t('shopMemberRequired'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('login'), onPress: () => router.push('/login') },
    ]);
  }, [router, t]);

  const quickActions = useProductQuickActions({ onRequireMember: requireMember });

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

  const cartCountQuery = useQuery({
    queryKey: ['commerce', 'cart'],
    queryFn: () => commerceService.getCart(),
    enabled: hasSession,
    staleTime: 30_000,
  });

  const cartQtyByProductId = useMemo(() => {
    const m = new Map<string, number>();
    for (const line of cartCountQuery.data?.items ?? []) {
      m.set(line.productId, (m.get(line.productId) ?? 0) + line.quantity);
    }
    return m;
  }, [cartCountQuery.data?.items]);

  const query = useInfiniteQuery({
    queryKey: ['commerce', 'search', q],
    queryFn: ({ pageParam }) =>
      commerceService.listPublicProducts({
        limit: 20,
        cursor: pageParam as string | undefined,
        search: q.trim() || undefined,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: q.trim().length >= 2,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const onAction = useCallback(
    (action: 'cart' | 'buy' | 'wish', product: ProductDto) => {
      quickActions.run(action, product.id, userRole);
    },
    [userRole, quickActions],
  );

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <TextInput
        placeholder={t('shopSearch')}
        value={q}
        onChangeText={setQ}
        style={[styles.inp, { borderColor: border, color: text, backgroundColor: surface }]}
        autoFocus
      />
      {!isMember ? (
        <View style={[styles.loginPromptCard, { borderColor: border, backgroundColor: surface }]}>
          <ThemedText style={styles.loginHint}>{t('shopWishlistMemberHint')}</ThemedText>
          <Pressable onPress={() => router.push('/login')} style={[styles.loginBtn, { borderColor: border }]}>
            <ThemedText type="link">{t('login')}</ThemedText>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        renderItem={({ item }: { item: ProductDto }) => (
          <View style={styles.col}>
            <ProductCard
              product={item}
              onPress={() => router.push(`/(tabs)/shop/${item.id}` as Href)}
              onBuyNow={() => onAction('buy', item)}
              onAddToCart={() => onAction('cart', item)}
              onToggleWishlist={() => onAction('wish', item)}
              isWishlisted={wishlistIdsQuery.data?.has(item.id)}
              inCartQty={cartQtyByProductId.get(item.id)}
              wishlistDisabled={!isMember}
              pendingAction={
                quickActions.pending?.productId === item.id ? quickActions.pending.action : null
              }
            />
          </View>
        )}
        ListEmptyComponent={
          q.trim().length < 2 ? (
            <ThemedText style={styles.hint}>{t('shopSearch')} (2+)</ThemedText>
          ) : query.isLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <ThemedText style={styles.hint}>{t('productEmpty')}</ThemedText>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, padding: 12 },
  inp: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 16 },
  loginPromptCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  loginHint: { opacity: 0.8 },
  loginBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  list: { paddingBottom: 24 },
  col: { width: '50%' },
  hint: { textAlign: 'center', marginTop: 24, opacity: 0.6 },
});
