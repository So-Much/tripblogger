import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ImageStyle,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { PostDto } from '@/src/types/post';
import { getContainedMediaFrame } from '@/src/utils/media-viewer-layout';

type MediaItem = PostDto['media'][number];

export type PostMediaSlot = 'square' | 'portrait' | 'landscape';

function mediaSources(item: MediaItem, mode: 'feed' | 'viewer' = 'feed'): string[] {
  const sources = mode === 'viewer'
    ? [item.originalUrl, item.previewUrl, item.url, item.thumbnailUrl]
    : [item.thumbnailUrl, item.previewUrl, item.url, item.originalUrl];
  return [...new Set(sources.filter((s): s is string => Boolean(s)))];
}

function ResilientPostImage({
  sources,
  unavailable,
  imageStyle,
  fallbackStyle,
  placeholder,
  contentFit,
  transition,
  fallbackLabel,
  retryLabel,
  fallbackTextColor,
}: {
  sources: string[];
  unavailable?: boolean;
  imageStyle: StyleProp<ImageStyle>;
  fallbackStyle: StyleProp<ViewStyle>;
  placeholder?: string;
  contentFit: 'contain';
  transition: number;
  fallbackLabel: string;
  retryLabel: string;
  fallbackTextColor?: string;
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [retrySeed, setRetrySeed] = useState(0);
  const sourceKey = sources.join('|');
  const currentSource = sources[sourceIndex];

  useEffect(() => {
    setSourceIndex(0);
    setFailed(false);
  }, [sourceKey]);

  const retry = () => {
    setSourceIndex(0);
    setFailed(false);
    setRetrySeed((value) => value + 1);
  };

  if (unavailable || failed || !currentSource) {
    return (
      <Pressable style={fallbackStyle} onPress={retry}>
        <ThemedText type="defaultSemiBold" style={[styles.fallbackText, fallbackTextColor ? { color: fallbackTextColor } : null]}>
          {fallbackLabel}
        </ThemedText>
        {!unavailable && sources.length ? (
          <ThemedText style={[styles.fallbackSubtext, fallbackTextColor ? { color: fallbackTextColor } : null]}>
            {retryLabel}
          </ThemedText>
        ) : null}
      </Pressable>
    );
  }

  return (
    <ExpoImage
      key={`${retrySeed}-${sourceIndex}-${currentSource}`}
      source={currentSource}
      style={imageStyle}
      contentFit={contentFit}
      cachePolicy="disk"
      placeholder={placeholder}
      transition={transition}
      onError={() => {
        setSourceIndex((nextIndex) => {
          if (nextIndex + 1 < sources.length) return nextIndex + 1;
          setFailed(true);
          return nextIndex;
        });
      }}
    />
  );
}

export function PostMediaBlock({
  media,
  compact = false,
  slot,
  onInteractionStart,
  onInteractionEnd,
  deferViewerOpen,
}: {
  media?: MediaItem[];
  compact?: boolean;
  slot?: PostMediaSlot;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
  deferViewerOpen?: (openViewer: () => void) => void;
}) {
  const items = useMemo(() => (media ?? []).filter((m) => Boolean(m?.url)), [media]);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const effectiveSlot: PostMediaSlot = slot ?? (compact ? 'square' : 'portrait');
  const slotAspect = useMemo(() => {
    if (effectiveSlot === 'portrait') return 4 / 5;
    if (effectiveSlot === 'landscape') return 16 / 9;
    return 1;
  }, [effectiveSlot]);

  const backdropColor = useThemeColor({ light: '#F1F5F9', dark: '#0F172A' }, 'background');
  const slotHeight = width ? Math.round(width / slotAspect) : 0;
  const viewerWidth = Math.round(screenWidth);
  const viewerHeight = Math.round(screenHeight);

  if (!items.length) return null;

  const openViewerAtIndex = (index: number) => {
    const openViewer = () => {
      setViewerIndex(index);
      setViewerOpen(true);
    };

    if (deferViewerOpen) {
      deferViewerOpen(openViewer);
      return;
    }

    openViewer();
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(next);
    onInteractionEnd?.();
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.sliderViewport,
          { aspectRatio: slotAspect, backgroundColor: backdropColor },
        ]}
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
              const sizeStyle = { width, height: slotHeight };
              if ((item.type ?? item.kind) === 'video') {
                return (
                  <Pressable
                    style={[styles.videoStub, sizeStyle, { backgroundColor: backdropColor }]}
                    onPress={() => {
                      openViewerAtIndex(items.findIndex((m) => m.url === item.url));
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
                    openViewerAtIndex(items.findIndex((m) => m.url === item.url));
                  }}>
                  <ResilientPostImage
                    sources={mediaSources(item, 'feed')}
                    unavailable={item.available === false}
                    imageStyle={[styles.image, sizeStyle, { backgroundColor: backdropColor }]}
                    fallbackStyle={[styles.imageFallback, sizeStyle, { backgroundColor: backdropColor }]}
                    contentFit="contain"
                    placeholder={item.placeholder}
                    transition={180}
                    fallbackLabel="Không tải được ảnh"
                    retryLabel="Chạm để thử lại"
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
        <View style={styles.viewerRoot}>
          <FlatList
            data={items}
            horizontal
            pagingEnabled
            style={styles.viewerList}
            initialScrollIndex={Math.max(viewerIndex, 0)}
            getItemLayout={(_data, index) => ({ index, length: viewerWidth, offset: viewerWidth * index })}
            keyExtractor={(item, idx) => `${item.url}-viewer-${idx}`}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const mediaFrame = getContainedMediaFrame({
                source: item,
                maxWidth: viewerWidth - 24,
                maxHeight: viewerHeight * 0.84,
              });

              if ((item.type ?? item.kind) === 'video') {
                return (
                  <View style={[styles.viewerItem, { width: viewerWidth }]}>
                    <Pressable style={styles.viewerCloseBand} onPress={() => setViewerOpen(false)} />
                    <View style={[styles.viewerMediaRow, { height: mediaFrame.height }]}>
                      <Pressable style={styles.viewerSideCloseBand} onPress={() => setViewerOpen(false)} />
                      <View style={[styles.viewerMediaBox, mediaFrame]}>
                        <View style={styles.viewerVideoStub}>
                          <ThemedText type="defaultSemiBold" style={styles.viewerText}>Video</ThemedText>
                          <ThemedText style={styles.viewerText}>{item.url}</ThemedText>
                        </View>
                      </View>
                      <Pressable style={styles.viewerSideCloseBand} onPress={() => setViewerOpen(false)} />
                    </View>
                    <Pressable style={styles.viewerCloseBand} onPress={() => setViewerOpen(false)} />
                  </View>
                );
              }
              return (
                <View style={[styles.viewerItem, { width: viewerWidth }]}>
                  <Pressable style={styles.viewerCloseBand} onPress={() => setViewerOpen(false)} />
                  <View style={[styles.viewerMediaRow, { height: mediaFrame.height }]}>
                    <Pressable style={styles.viewerSideCloseBand} onPress={() => setViewerOpen(false)} />
                    <View style={[styles.viewerMediaBox, mediaFrame]}>
                      <ResilientPostImage
                        sources={mediaSources(item, 'viewer')}
                        unavailable={item.available === false}
                        imageStyle={styles.viewerImage}
                        fallbackStyle={styles.viewerImageFallback}
                        contentFit="contain"
                        placeholder={item.placeholder}
                        transition={220}
                        fallbackLabel="Không tải được ảnh"
                        retryLabel="Chạm để thử lại"
                        fallbackTextColor="#fff"
                      />
                    </View>
                    <Pressable style={styles.viewerSideCloseBand} onPress={() => setViewerOpen(false)} />
                  </View>
                  <Pressable style={styles.viewerCloseBand} onPress={() => setViewerOpen(false)} />
                </View>
              );
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
  },
  image: {
    borderRadius: 14,
  },
  imageFallback: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 4,
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
  viewerRoot: { flex: 1, backgroundColor: 'rgba(2,6,23,0.92)' },
  viewerList: { flex: 1 },
  viewerItem: { flex: 1 },
  viewerCloseBand: { flex: 1 },
  viewerMediaRow: { flexDirection: 'row', alignItems: 'center' },
  viewerSideCloseBand: { flex: 1, alignSelf: 'stretch' },
  viewerMediaBox: { alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '100%' },
  viewerImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  viewerVideoStub: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 8 },
  viewerText: { color: '#fff', textAlign: 'center' },
  fallbackText: { textAlign: 'center' },
  fallbackSubtext: { textAlign: 'center', opacity: 0.72 },
});
