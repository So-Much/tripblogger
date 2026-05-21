import { useCallback, useLayoutEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation, useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { ProductDto } from '@/src/types/commerce';
import { formatApiError } from '@/src/utils/format-api-error';
import { ProductCard } from '@/src/components/commerce/ProductCard';

export function MyProductsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const me = useMeQuery();
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  const q = useInfiniteQuery({
    queryKey: ['commerce', 'mine'],
    queryFn: ({ pageParam }) => commerceService.listMyProducts({ limit: 20, cursor: pageParam as string | undefined }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: me.data?.role === 'MEMBER',
  });

  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data?.pages]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push('/(tabs)/shop/create')} style={{ marginRight: 12 }}>
          <IconSymbol name="plus.circle.fill" size={26} color={tint} />
        </Pressable>
      ),
    });
  }, [navigation, router, tint]);

  const renderItem = useCallback(
    ({ item }: { item: ProductDto }) => (
      <View style={{ width: '50%', paddingHorizontal: 4 }}>
        <ProductCard
          product={item}
          onPress={() => router.push(`/(tabs)/shop/${item.id}` as Href)}
          onLongPress={() =>
            Alert.alert(item.title, undefined, [
              { text: t('cancel'), style: 'cancel' },
              {
                text: t('productEdit'),
                onPress: () => router.push(`/(tabs)/shop/edit/${item.id}` as Href),
              },
              {
                text: t('productDelete'),
                style: 'destructive',
                onPress: () => {
                  void commerceService.deleteProduct(item.id).then(() => void q.refetch());
                },
              },
            ])
          }
          borderColor={border}
          cardColor={card}
          tint={tint}
        />
      </View>
    ),
    [router, border, card, tint, t, q],
  );

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
        <ThemedText style={styles.center}>{formatApiError(q.error, '')}</ThemedText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          ListEmptyComponent={q.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : <ThemedText style={styles.center}>{t('productEmpty')}</ThemedText>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, center: { textAlign: 'center', marginTop: 24, padding: 16 } });
