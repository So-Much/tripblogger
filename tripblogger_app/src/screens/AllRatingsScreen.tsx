import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';
import type { ProductRatingDto } from '@/src/types/commerce';

type StarTab = 'all' | 1 | 2 | 3 | 4 | 5;

const TABS: { key: StarTab; labelKey: 'ratingsTabAll' | 'ratingsTab5' | 'ratingsTab4' | 'ratingsTab3' | 'ratingsTab2' | 'ratingsTab1' }[] = [
  { key: 'all', labelKey: 'ratingsTabAll' },
  { key: 5, labelKey: 'ratingsTab5' },
  { key: 4, labelKey: 'ratingsTab4' },
  { key: 3, labelKey: 'ratingsTab3' },
  { key: 2, labelKey: 'ratingsTab2' },
  { key: 1, labelKey: 'ratingsTab1' },
];

export function AllRatingsScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const [tab, setTab] = useState<StarTab>('all');

  const scoreParam = tab === 'all' ? undefined : tab;

  const q = useInfiniteQuery({
    queryKey: ['commerce', 'ratings', 'list', productId, tab],
    queryFn: ({ pageParam }) =>
      commerceService.listProductRatings(String(productId), {
        limit: 20,
        cursor: pageParam as string | undefined,
        sort: 'newest',
        score: scoreParam,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!productId,
  });

  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data?.pages]);

  const renderItem = useCallback(
    ({ item }: { item: ProductRatingDto }) => (
      <View style={[styles.card, { borderColor: border }]}>
        <View style={styles.row}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.ph]} />
          )}
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">{item.displayName ?? '—'}</ThemedText>
            <View style={styles.starRow}>
              {Array.from({ length: item.score }).map((_, i) => (
                <IconSymbol key={i} name="star.fill" size={14} color={tint} />
              ))}
            </View>
          </View>
        </View>
        {item.review ? <ThemedText style={{ marginTop: 8 }}>{item.review}</ThemedText> : null}
        <ThemedText style={styles.small}>{item.createdAt}</ThemedText>
      </View>
    ),
    [border, tint],
  );

  if (!productId) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText>—</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((x) => (
          <Pressable
            key={String(x.key)}
            onPress={() => setTab(x.key)}
            style={[styles.tab, { borderColor: tab === x.key ? tint : border }]}>
            <ThemedText style={styles.tabTxt}>{t(x.labelKey)}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      {q.isError ? (
        <ThemedText style={styles.center}>{formatApiError(q.error, '')}</ThemedText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={q.isLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : <ThemedText style={styles.center}>—</ThemedText>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center', marginTop: 24, padding: 16 },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingTop: 8 },
  tab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  tabTxt: { fontSize: 12 },
  list: { padding: 12, gap: 10, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  starRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  ph: { backgroundColor: '#2223' },
  small: { fontSize: 12, opacity: 0.75, marginTop: 4 },
});
