import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { PostDto } from '@/src/types/post';

type MediaItem = PostDto['media'][number];

export function PostMediaBlock({
  media,
  compact = false,
  onInteractionStart,
  onInteractionEnd,
}: {
  media?: MediaItem[];
  compact?: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}) {
  const items = useMemo(() => (media ?? []).filter((m) => Boolean(m?.url)), [media]);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  if (!items.length) return null;
  const slideHeight = compact ? 140 : 220;

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(next);
    onInteractionEnd?.();
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
            bounces={false}
            decelerationRate="fast"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={onInteractionStart}
            onMomentumScrollEnd={onMomentumEnd}
            onScrollEndDrag={onInteractionEnd}
            renderItem={({ item }) => {
              const sizeStyle = { width, height: slideHeight };
              if ((item.type ?? item.kind) === 'video') {
                return (
                  <Pressable style={[styles.videoStub, sizeStyle]} onPress={() => {
                    setViewerIndex(items.findIndex((m) => m.url === item.url));
                    setViewerOpen(true);
                  }}>
                    <ThemedText type="defaultSemiBold">Video</ThemedText>
                    <ThemedText numberOfLines={1}>{item.url}</ThemedText>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  style={sizeStyle}
                  onPress={() => {
                    setViewerIndex(items.findIndex((m) => m.url === item.url));
                    setViewerOpen(true);
                  }}>
                  <Image source={{ uri: item.url }} style={[styles.image, sizeStyle]} resizeMode="cover" />
                </Pressable>
              );
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
      <Modal transparent visible={viewerOpen} animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.viewerRoot}>
          <Pressable style={styles.viewerBackdrop} onPress={() => setViewerOpen(false)} />
          <FlatList
            data={items}
            horizontal
            pagingEnabled
            initialScrollIndex={Math.max(viewerIndex, 0)}
            getItemLayout={(_data, index) => ({ index, length: width || 1, offset: (width || 1) * index })}
            keyExtractor={(item, idx) => `${item.url}-viewer-${idx}`}
            renderItem={({ item }) => {
              if ((item.type ?? item.kind) === 'video') {
                return (
                  <View style={[styles.viewerVideoStub, { width: width || 1 }]}>
                    <ThemedText type="defaultSemiBold" style={styles.viewerText}>Video</ThemedText>
                    <ThemedText style={styles.viewerText}>{item.url}</ThemedText>
                  </View>
                );
              }
              return <Image source={{ uri: item.url }} style={[styles.viewerImage, { width: width || 1 }]} resizeMode="contain" />;
            }}
          />
        </View>
      </Modal>
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
  viewerRoot: { flex: 1, backgroundColor: 'rgba(2,6,23,0.92)', justifyContent: 'center' },
  viewerBackdrop: { ...StyleSheet.absoluteFillObject },
  viewerImage: { height: '82%' },
  viewerVideoStub: { height: '82%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 8 },
  viewerText: { color: '#fff', textAlign: 'center' },
});

