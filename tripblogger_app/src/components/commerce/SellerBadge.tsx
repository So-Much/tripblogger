import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function SellerBadge({
  name,
  verified,
  color,
}: {
  name: string;
  verified: boolean;
  color: string;
}) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.name} numberOfLines={1}>
        {name}
      </ThemedText>
      {verified ? <IconSymbol name="checkmark.seal.fill" size={14} color={color} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  name: { fontSize: 12, opacity: 0.85 },
});
