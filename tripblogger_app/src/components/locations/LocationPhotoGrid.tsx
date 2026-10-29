import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LocationMediaDto } from '@/src/services/api/locations.service';

type LocationPhotoGridProps = {
  items: LocationMediaDto[];
};

export function LocationPhotoGrid({ items }: LocationPhotoGridProps) {
  const insets = useSafeAreaInsets();
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  if (!items.length) return null;

  const shown = items.slice(0, 6);

  return (
    <>
      <View style={styles.grid}>
        {shown.map((item) => (
          <Pressable key={item.id} style={styles.cell} onPress={() => setViewerUrl(item.url)}>
            <Image source={{ uri: item.thumbnailUrl ?? item.url }} style={styles.image} contentFit="cover" />
          </Pressable>
        ))}
      </View>
      <Modal visible={viewerUrl != null} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerUrl(null)}>
          {viewerUrl ? (
            <Image
              source={{ uri: viewerUrl }}
              style={[styles.viewerImage, { marginTop: insets.top }]}
              contentFit="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '31%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: { width: '100%', height: '80%' },
});
