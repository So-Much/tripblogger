import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import type { CompositionListItem } from '@/src/types/composition';

type Props = {
  items: CompositionListItem[];
  selectedId: string | null;
  onSelect: (item: CompositionListItem) => void;
};

function MiniThumb({ name, active }: { name: string; active: boolean }) {
  const tint = useThemeColor({}, 'tint');
  return (
    <View style={[styles.miniBox, { borderColor: active ? tint : 'rgba(255,255,255,0.45)' }]}>
      <View style={styles.miniLabel}>
        <View style={[styles.miniDot, active && { backgroundColor: tint }]} />
      </View>
    </View>
  );
}

export function CompositionStrip({ items, selectedId, onSelect }: Props) {
  const card = useThemeColor({}, 'card');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled">
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item)}
            style={[styles.chip, { backgroundColor: card }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.name}>
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbImg} />
            ) : (
              <MiniThumb name={item.name} active={active} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    width: 56,
    height: 56,
    borderRadius: 14,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: 48, height: 48, borderRadius: 10 },
  miniBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLabel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  miniDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
