import { useCallback } from 'react';
import { FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import type { ProductDto } from '@/src/types/commerce';
import { ProductCard } from './ProductCard';

export function ProductGrid({
  items,
  onSelect,
  onLongPress,
}: {
  items: ProductDto[];
  onSelect: (p: ProductDto) => void;
  onLongPress?: (p: ProductDto) => void;
}) {
  const { width } = useWindowDimensions();
  const numColumns = 2;
  const colW = (width - 32) / numColumns;

  const renderItem = useCallback(
    ({ item }: { item: ProductDto }) => (
      <ProductCard
        product={item}
        onPress={() => onSelect(item)}
        onLongPress={onLongPress ? () => onLongPress(item) : undefined}
      />
    ),
    [onSelect, onLongPress],
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => p.id}
      numColumns={numColumns}
      renderItem={renderItem}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      getItemLayout={(_, index) => ({ length: colW, offset: colW * Math.floor(index / numColumns), index })}
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 4, paddingBottom: 24 },
  row: { justifyContent: 'space-between' },
});
