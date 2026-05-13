import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export function CategoryChip({
  label,
  selected,
  onPress,
  borderColor,
  tint,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  borderColor: string;
  tint: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? tint : borderColor, backgroundColor: selected ? `${tint}22` : 'transparent' }]}>
      <ThemedText style={styles.txt}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  txt: { fontSize: 13 },
});
