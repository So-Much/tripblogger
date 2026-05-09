import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import type { ReactionTypeDto } from '@/src/types/post';

export function ReactionPicker({
  open,
  options,
  onSelect,
  onClose,
  selectedCode,
  anchor,
}: {
  open: boolean;
  options: ReactionTypeDto[];
  onSelect: (typeCode: string) => void;
  onClose: () => void;
  selectedCode?: string | null;
  anchor?: { x: number; y: number } | null;
}) {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const previewCode = hoveredCode ?? selectedCode ?? null;
  const top = Math.max(12, (anchor?.y ?? 200) - 86);
  const left = Math.max(8, (anchor?.x ?? 120) - Math.min(options.length, 6) * 28);
  const itemWidth = 54;
  const touchIndex = (x: number) => Math.max(0, Math.min(options.length - 1, Math.floor(x / itemWidth)));
  const previewType = useMemo(() => options.find((o) => o.code === previewCode) ?? null, [options, previewCode]);

  useEffect(() => {
    if (!open) setHoveredCode(null);
  }, [open]);

  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={() => {
        setHoveredCode(null);
        onClose();
      }}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}}>
        <View
          style={[styles.bar, { top, left }]}
          onTouchMove={(e) => {
            const idx = touchIndex(e.nativeEvent.locationX);
            setHoveredCode(options[idx]?.code ?? null);
          }}
          onTouchEnd={() => {
            if (hoveredCode) onSelect(hoveredCode);
            setHoveredCode(null);
          }}>
          {options.map((o) => (
            <Pressable
              key={o.code}
              onPress={() => onSelect(o.code)}
              onPressIn={() => setHoveredCode(o.code)}
              onPressOut={() => setHoveredCode(null)}
              style={[
                styles.item,
                previewCode === o.code ? styles.itemActive : null,
              ]}>
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
        {previewType ? (
          <View style={[styles.previewBadge, { top: Math.max(8, top - 36), left }]}>
            <ThemedText style={styles.previewText}>{previewType.name}</ThemedText>
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.04)' },
  bar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    width: 50,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemActive: {
    backgroundColor: 'rgba(37,99,235,0.14)',
    transform: [{ scale: 1.08 }],
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
  previewBadge: {
    position: 'absolute',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});

