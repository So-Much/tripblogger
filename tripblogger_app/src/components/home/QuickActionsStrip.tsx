import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';

const ACTIONS: { key: string; label: string; icon: IconSymbolName }[] = [
  { key: 'feed', label: 'For you', icon: 'house.fill' },
  { key: 'shop', label: 'Shop', icon: 'cart.fill' },
  { key: 'live', label: 'Live', icon: 'video.fill' },
  { key: 'inbox', label: 'Inbox', icon: 'envelope.fill' },
];

export function QuickActionsStrip() {
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const accent = useThemeColor({}, 'accent');

  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => (
        <Pressable
          key={a.key}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: card, borderColor: border },
            pressed && styles.chipPressed,
          ]}
          hitSlop={{ top: 4, bottom: 4 }}
        >
          <IconSymbol size={18} name={a.icon} color={accent} />
          <ThemedText type="defaultSemiBold" style={styles.label}>
            {a.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipPressed: {
    opacity: 0.92,
  },
  label: {
    fontSize: 13,
  },
});
