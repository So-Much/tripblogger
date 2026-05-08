import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { ReactionTypeDto } from '@/src/types/post';

export function ReactionPicker({
  open,
  options,
  onSelect,
  onClose,
  anchor,
}: {
  open: boolean;
  options: ReactionTypeDto[];
  onSelect: (typeCode: string) => void;
  onClose: () => void;
  anchor?: { x: number; y: number } | null;
}) {
  const top = Math.max(12, (anchor?.y ?? 200) - options.length * 58 - 12);
  const left = Math.max(10, (anchor?.x ?? 120) - 26);

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.bar, { top, left }]}>
          {options.map((o) => (
            <Pressable key={o.code} onPress={() => onSelect(o.code)} style={styles.item}>
              {o.media?.startsWith('http') ? (
                <Image source={{ uri: o.media }} style={styles.mediaIcon} />
              ) : (
                <ThemedText style={styles.fallbackIcon}>{o.media || o.name[0]}</ThemedText>
              )}
              <ThemedText style={styles.name}>{o.name}</ThemedText>
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.04)' },
  bar: {
    position: 'absolute',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    width: 56,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  mediaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  fallbackIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    lineHeight: 28,
    textAlign: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 10, fontWeight: '600' },
});

