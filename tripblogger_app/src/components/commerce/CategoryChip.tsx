import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useCommerceTheme } from '@/hooks/use-commerce-theme';

export function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { primary, border, text, cta, radius } = useCommerceTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: radius.pill,
          borderColor: selected ? cta : border,
          backgroundColor: selected ? primary : 'transparent',
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <ThemedText style={[styles.txt, { color: text, fontWeight: selected ? '600' : '400' }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  txt: { fontSize: 14 },
});
