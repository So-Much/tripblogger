import { useCallback } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { ProductDto } from '@/src/types/commerce';
import { ProductCard } from './ProductCard';

export function ProductGrid({
  products,
  onSelect,
  borderColor,
  cardColor,
  tint,
}: {
  products: ProductDto[];
  onSelect: (p: ProductDto) => void;
  borderColor: string;
  cardColor: string;
  tint: string;
}) {
  const { width } = useWindowDimensions();
  const colW = (width - 32) / 2;
  const render = useCallback(
    ({ item }: { item: ProductDto }) => (
      <View style={{ width: colW }}>
        <ProductCard product={item} onPress={() => onSelect(item)} borderColor={borderColor} cardColor={cardColor} tint={tint} />
      </View>
    ),
    [borderColor, cardColor, colW, onSelect, tint],
  );
  return (
    <FlatList
      data={products}
      keyExtractor={(i) => i.id}
      numColumns={2}
      renderItem={render}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  row: { justifyContent: 'space-between', paddingHorizontal: 4 },
  list: { paddingBottom: 16 },
});
