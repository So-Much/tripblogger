import { Animated, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import type { ReactionTypeDto } from '@/src/types/post';

function ReactionPickerItem({
  option,
  active,
  previewed,
  onPreview,
  onClearPreview,
  onSelect,
}: {
  option: ReactionTypeDto;
  active: boolean;
  previewed: boolean;
  onPreview: () => void;
  onClearPreview: () => void;
  onSelect: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const labelProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(labelProgress, {
      toValue: previewed ? 1 : 0,
      duration: previewed ? 120 : 90,
      useNativeDriver: true,
    }).start();
  }, [labelProgress, previewed]);

  const runPressAnimation = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.24, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 18, bounciness: 10, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable
      onPress={() => {
        onSelect();
        runPressAnimation();
      }}
      onPressIn={onPreview}
      onPressOut={onClearPreview}
      onHoverIn={onPreview}
      onHoverOut={onClearPreview}
      style={styles.item}>
      <Animated.View
        style={[
          styles.iconWrap,
          active ? styles.iconWrapActive : null,
          previewed ? styles.iconWrapPreviewed : null,
          { transform: [{ scale }] },
        ]}>
        {option.media?.startsWith('http') ? (
          <Image source={{ uri: option.media }} style={styles.mediaIcon} />
        ) : (
          <ThemedText style={styles.fallbackIcon}>{option.media || option.name[0]}</ThemedText>
        )}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.nameBubble,
          {
            opacity: labelProgress,
            transform: [
              {
                translateY: labelProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-4, 0],
                }),
              },
            ],
          },
        ]}>
        <ThemedText style={styles.name}>{option.name}</ThemedText>
      </Animated.View>
    </Pressable>
  );
}

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
  const top = Math.max(12, (anchor?.y ?? 200) - 72);
  const left = Math.max(8, (anchor?.x ?? 120) - Math.min(options.length, 6) * 28);

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
          <View style={[styles.bar, { top, left }]}>
            {options.map((o) => (
              <ReactionPickerItem
                key={o.code}
                option={o}
                active={selectedCode === o.code}
                previewed={hoveredCode === o.code}
                onPreview={() => setHoveredCode(o.code)}
                onClearPreview={() => setHoveredCode(null)}
                onSelect={() => onSelect(o.code)}
              />
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.02)' },
  bar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  item: {
    width: 46,
    minHeight: 64,
    alignItems: 'center',
    paddingTop: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  iconWrapActive: {
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  iconWrapPreviewed: {
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 10,
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
  },
  nameBubble: {
    marginTop: 5,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  name: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

