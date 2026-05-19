import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View, type ListRenderItem } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ProductCard } from '@/src/components/commerce/ProductCard';
import type { ProductDto } from '@/src/types/commerce';

type ProductListProps = {
  items: ProductDto[];
  isLoading: boolean;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onPressProduct: (id: string) => void;
  onLongPressProduct?: (product: ProductDto) => void;
  ListHeaderComponent?: React.ReactElement | null;
  emptyLabel: string;
  numColumns?: 1 | 2;
};

function ProductListInner({
  items,
  isLoading,
  isRefetching,
  isFetchingNextPage,
  onRefresh,
  onEndReached,
  onPressProduct,
  onLongPressProduct,
  ListHeaderComponent,
  emptyLabel,
  numColumns = 2,
}: ProductListProps) {
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'textMuted');

  const renderItem: ListRenderItem<ProductDto> = useCallback(
    ({ item }) => (
      <View style={numColumns === 2 ? styles.col : styles.colFull}>
        <ProductCard
          product={item}
          onPress={() => onPressProduct(item.id)}
          onLongPress={onLongPressProduct ? () => onLongPressProduct(item) : undefined}
          borderColor={border}
          cardColor={card}
          tint={tint}
        />
      </View>
    ),
    [border, card, tint, numColumns, onPressProduct, onLongPressProduct],
  );

  return (
    <FlatList
      data={items}
      key={numColumns}
      keyExtractor={(i) => i.id}
      numColumns={numColumns}
      renderItem={renderItem}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.35}
      initialNumToRender={10}
      maxToRenderPerBatch={8}
      windowSize={7}
      removeClippedSubviews
      ListHeaderComponent={ListHeaderComponent ?? undefined}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : <View style={styles.footerSpacer} />
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator style={styles.empty} />
        ) : (
          <ThemedText style={[styles.empty, { color: muted }]}>{emptyLabel}</ThemedText>
        )
      }
      contentContainerStyle={styles.list}
    />
  );
}

export const ProductList = memo(ProductListInner);

const styles = StyleSheet.create({
  list: { paddingHorizontal: 8, paddingBottom: 24 },
  col: { width: '50%', paddingHorizontal: 4 },
  colFull: { width: '100%', paddingHorizontal: 4 },
  footer: { marginVertical: 16 },
  footerSpacer: { height: 8 },
  empty: { textAlign: 'center', marginTop: 40, paddingHorizontal: 16 },
});
