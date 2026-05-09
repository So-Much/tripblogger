import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import type { PostDto } from '@/src/types/post';

type MediaItem = PostDto['media'][number];

function mediaSources(item: MediaItem, preferOriginal = false): string[] {
  const sources = preferOriginal
    ? [item.originalUrl, item.previewUrl, item.url, item.thumbnailUrl]
    : [item.thumbnailUrl, item.previewUrl, item.url, item.originalUrl];
  return [...new Set(sources.filter((s): s is string => Boolean(s)))];
}

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
  const viewerWidth = width || Dimensions.get('window').width;

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
                  <ExpoImage
                    source={mediaSources(item)}
                    style={[styles.image, sizeStyle]}
                    contentFit="cover"
                    placeholder={item.placeholder}
                    transition={180}
                  />
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
        <Pressable style={styles.viewerRoot} onPress={() => setViewerOpen(false)}>
          <Pressable style={styles.viewerFrame} onPress={() => {}}>
            <FlatList
              data={items}
              horizontal
              pagingEnabled
              initialScrollIndex={Math.max(viewerIndex, 0)}
              getItemLayout={(_data, index) => ({ index, length: viewerWidth, offset: viewerWidth * index })}
              keyExtractor={(item, idx) => `${item.url}-viewer-${idx}`}
              renderItem={({ item }) => {
                if ((item.type ?? item.kind) === 'video') {
                  return (
                    <View style={[styles.viewerItem, { width: viewerWidth }]}>
                      <View style={styles.viewerVideoStub}>
                        <ThemedText type="defaultSemiBold" style={styles.viewerText}>Video</ThemedText>
                        <ThemedText style={styles.viewerText}>{item.url}</ThemedText>
                      </View>
                    </View>
                  );
                }
                return (
                  <View style={[styles.viewerItem, { width: viewerWidth }]}>
                    <ExpoImage
                      source={mediaSources(item, true)}
                      style={styles.viewerImage}
                      contentFit="contain"
                      placeholder={item.placeholder}
                      transition={220}
                    />
                  </View>
                );
              }}
            />
          </Pressable>
        </Pressable>
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
  viewerFrame: { alignSelf: 'stretch' },
  viewerItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  viewerImage: { width: '100%', height: '84%' },
  viewerVideoStub: { width: '100%', height: '84%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 8 },
  viewerText: { color: '#fff', textAlign: 'center' },
});

