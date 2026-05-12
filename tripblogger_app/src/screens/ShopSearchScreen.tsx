import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import type { ProductDto } from '@/src/types/commerce';
import { ProductCard } from '@/src/components/commerce/ProductCard';

export function ShopSearchScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState('');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

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

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <TextInput
        placeholder={t('shopSearch')}
        value={q}
        onChangeText={setQ}
        style={[styles.inp, { borderColor: border, color: text }]}
      />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        renderItem={({ item }: { item: ProductDto }) => (
          <View style={{ width: '50%', paddingHorizontal: 4 }}>
            <ProductCard
              product={item}
              onPress={() => router.push(`/(tabs)/shop/${item.id}` as Href)}
              borderColor={border}
              cardColor={card}
              tint={tint}
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
  inp: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
  hint: { textAlign: 'center', marginTop: 24, opacity: 0.6 },
});
