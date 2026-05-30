import { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';
import { ProductCard } from '@/src/components/commerce/ProductCard';
import type { ProductQuickAction } from '@/src/hooks/use-product-quick-actions';
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
  onBuyNow?: (product: ProductDto) => void;
  onAddToCart?: (product: ProductDto) => void;
  onToggleWishlist?: (product: ProductDto) => void;
  wishlistedIds?: Set<string>;
  cartQtyByProductId?: Map<string, number>;
  actionsDisabled?: boolean;
  pendingProductId?: string | null;
  pendingAction?: ProductQuickAction | null;
  ListHeaderComponent?: React.ReactElement | null;
  emptyLabel: string;
  numColumns?: 1 | 2;
  currentUserId?: string | null;
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
  onBuyNow,
  onAddToCart,
  onToggleWishlist,
  wishlistedIds,
  cartQtyByProductId,
  actionsDisabled,
  pendingProductId,
  pendingAction,
  ListHeaderComponent,
  emptyLabel,
  numColumns = 2,
  currentUserId,
}: ProductListProps) {
  const { textMuted } = useCommerceTheme();

  const renderItem: ListRenderItem<ProductDto> = useCallback(
    ({ item }) => {
      const isOwn = Boolean(currentUserId && item.sellerId === currentUserId);
      return (
      <View style={numColumns === 2 ? styles.col : styles.colFull}>
        <ProductCard
          product={item}
          cardVariant={isOwn ? 'own' : 'marketplace'}
          onPress={() => onPressProduct(item.id)}
          onLongPress={onLongPressProduct ? () => onLongPressProduct(item) : undefined}
          onBuyNow={!isOwn && onBuyNow ? () => onBuyNow(item) : undefined}
          onAddToCart={!isOwn && onAddToCart ? () => onAddToCart(item) : undefined}
          onToggleWishlist={!isOwn && onToggleWishlist ? () => onToggleWishlist(item) : undefined}
          isWishlisted={wishlistedIds?.has(item.id)}
          inCartQty={cartQtyByProductId?.get(item.id)}
          actionsDisabled={actionsDisabled}
          pendingAction={pendingProductId === item.id ? pendingAction ?? null : null}
        />
      </View>
      );
    },
    [
      numColumns,
      onPressProduct,
      onLongPressProduct,
      onBuyNow,
      onAddToCart,
      onToggleWishlist,
      wishlistedIds,
      cartQtyByProductId,
      actionsDisabled,
      pendingProductId,
      pendingAction,
      currentUserId,
    ],
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
      initialNumToRender={8}
      maxToRenderPerBatch={6}
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
          <ThemedText style={[styles.empty, { color: textMuted }]}>{emptyLabel}</ThemedText>
        )
      }
      contentContainerStyle={styles.list}
    />
  );
}

export const ProductList = memo(ProductListInner);

const styles = StyleSheet.create({
  list: { paddingTop: 4, paddingBottom: 24 },
  col: { width: '50%' },
  colFull: { width: '100%', paddingHorizontal: 4 },
  footer: { marginVertical: 16 },
  footerSpacer: { height: 8 },
  empty: { textAlign: 'center', marginTop: 40, paddingHorizontal: 16 },
});
