import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { OrderDto } from '@/src/types/commerce';
import { formatApiError } from '@/src/utils/format-api-error';
import { PriceLabel } from '@/src/components/commerce/PriceLabel';

type OrderListFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';

function orderListParams(f: OrderListFilter): { status?: string; statusIn?: string } {
  switch (f) {
    case 'PENDING':
      return { status: 'PENDING' };
    case 'IN_PROGRESS':
      return { statusIn: 'CONFIRMED,SHIPPING' };
    case 'DELIVERED':
      return { status: 'DELIVERED' };
    case 'CANCELLED':
      return { status: 'CANCELLED' };
    default:
      return {};
  }
}

export function OrdersScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const me = useMeQuery();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [orderFilter, setOrderFilter] = useState<OrderListFilter>('ALL');

  const listExtra = orderListParams(orderFilter);

  const buyQ = useInfiniteQuery({
    queryKey: ['commerce', 'orders', 'buy', orderFilter],
    queryFn: ({ pageParam }) =>
      commerceService.listOrders({
        limit: 20,
        cursor: pageParam as string | undefined,
        ...listExtra,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: me.data?.role === 'MEMBER' && tab === 'buy',
  });

  const sellQ = useInfiniteQuery({
    queryKey: ['commerce', 'orders', 'sell', orderFilter],
    queryFn: ({ pageParam }) =>
      commerceService.listSellerOrders({
        limit: 20,
        cursor: pageParam as string | undefined,
        ...listExtra,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: me.data?.role === 'MEMBER' && tab === 'sell',
  });

  const q = tab === 'buy' ? buyQ : sellQ;
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data?.pages]);

  const filterChips: { key: OrderListFilter; label: string }[] = [
    { key: 'ALL', label: t('orderFilterAll') },
    { key: 'PENDING', label: t('orderFilterPending') },
    { key: 'IN_PROGRESS', label: t('orderFilterShipping') },
    { key: 'DELIVERED', label: t('orderFilterDelivered') },
    { key: 'CANCELLED', label: t('orderFilterCancelled') },
  ];

  if (me.data?.role !== 'MEMBER') {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>{t('shopMemberRequired')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('buy')}
          style={[styles.tab, { borderColor: tab === 'buy' ? tint : border }]}>
          <ThemedText>{t('myOrders')}</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setTab('sell')}
          style={[styles.tab, { borderColor: tab === 'sell' ? tint : border }]}>
          <ThemedText>{t('sellerOrders')}</ThemedText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {filterChips.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => setOrderFilter(c.key)}
            style={[
              styles.chip,
              { borderColor: orderFilter === c.key ? tint : border, borderWidth: orderFilter === c.key ? 2 : 1 },
            ]}>
            <ThemedText style={styles.chipTxt}>{c.label}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      {q.isError ? (
        <ThemedText style={styles.center}>{formatApiError(q.error, '')}</ThemedText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(o) => o.id}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          renderItem={({ item }: { item: OrderDto }) => (
            <Pressable style={[styles.card, { borderColor: border }]} onPress={() => router.push(`/(tabs)/shop/order/${item.id}` as Href)}>
              <ThemedText type="defaultSemiBold">{item.orderCode}</ThemedText>
              <ThemedText style={styles.small}>{item.status}</ThemedText>
              <PriceLabel amount={item.totalAmount} />
            </Pressable>
          )}
          ListEmptyComponent={q.isLoading ? <ActivityIndicator style={{ marginTop: 32 }} /> : <ThemedText style={styles.center}>—</ThemedText>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center', marginTop: 24, padding: 16 },
  tabs: { flexDirection: 'row', gap: 8, padding: 12 },
  tab: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', minHeight: 44 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTxt: { fontSize: 13 },
  card: { marginHorizontal: 12, marginBottom: 10, padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  small: { fontSize: 12, opacity: 0.75 },
});
