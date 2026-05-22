import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { ProductDto } from '@/src/types/commerce';
import { formatApiError } from '@/src/utils/format-api-error';
import { ProductCard } from '@/src/components/commerce/ProductCard';

export function WishlistScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMeQuery();
  const toggleWish = useMutation({
    mutationFn: (productId: string) => commerceService.toggleWishlist(productId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['commerce', 'wishlist'] }),
  });

  const q = useInfiniteQuery({
    queryKey: ['commerce', 'wishlist'],
    queryFn: ({ pageParam }) => commerceService.listWishlist({ limit: 20, cursor: pageParam as string | undefined }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: me.data?.role === 'MEMBER',
  });

  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data?.pages]);

  if (me.data?.role !== 'MEMBER') {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('shopMemberRequired')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      {q.isError ? (
        <ThemedText>{formatApiError(q.error, '')}</ThemedText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          renderItem={({ item }: { item: ProductDto }) => (
            <View style={{ width: '50%', paddingHorizontal: 4 }}>
              <ProductCard
                product={item}
                onPress={() => router.push(`/(tabs)/shop/${item.id}` as Href)}
                wishlistRemoveLabel={t('wishlistRemoveHint')}
                onRemoveFromWishlist={() => toggleWish.mutate(item.id)}
              />
            </View>
          )}
          ListEmptyComponent={
            q.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
              <ThemedText style={styles.center}>{t('wishlistEmpty')}</ThemedText>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, center: { textAlign: 'center', marginTop: 24, padding: 16 } });
