import { useMemo, useState } from 'react';
import { FlatList, Image, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { PostDto } from '@/src/types/post';

type MediaItem = PostDto['media'][number];

export function PostMediaBlock({ media, compact = false }: { media?: MediaItem[]; compact?: boolean }) {
  const items = useMemo(() => (media ?? []).filter((m) => Boolean(m?.url)), [media]);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  if (!items.length) return null;
  const slideHeight = compact ? 140 : 220;

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(next);
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.sliderViewport, { height: slideHeight }]}
        onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}>
        {width ? (
          <FlatList
            data={items}
            keyExtractor={(item, idx) => `${item.url}-${idx}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            renderItem={({ item }) => {
              const sizeStyle = { width, height: slideHeight };
              if ((item.type ?? item.kind) === 'video') {
                return (
                  <View style={[styles.videoStub, sizeStyle]}>
                    <ThemedText type="defaultSemiBold">Video</ThemedText>
                    <ThemedText numberOfLines={1}>{item.url}</ThemedText>
                  </View>
                );
              }
              return <Image source={{ uri: item.url }} style={[styles.image, sizeStyle]} resizeMode="cover" />;
            }}
          />
        ) : null}
      </View>
      {items.length > 1 ? (
        <View style={styles.dotRow}>
          {items.map((_, idx) => (
            <View key={idx} style={[styles.dot, idx === activeIndex ? styles.dotActive : null]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  sliderViewport: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  image: {
    borderRadius: 14,
  },
  videoStub: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
    paddingHorizontal: 12,
  },
  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  dotActive: { backgroundColor: '#2563EB', width: 14 },
});

