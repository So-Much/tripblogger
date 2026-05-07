import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

export function PromoBanner() {
  const cta = useThemeColor({}, 'cta');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <View style={[styles.wrap, { borderColor: cta, backgroundColor: card }]}>
      <View style={[styles.iconWrap, { borderColor: cta }]}>
        <IconSymbol size={22} name="bolt.fill" color={cta} />
      </View>
      <View style={styles.textCol}>
        <ThemedText type="defaultSemiBold">Flash window — free ship from 50k</ThemedText>
        <ThemedText style={{ color: muted, marginTop: 2 }}>Ends in 02:14:33 · Shopee-style deals below</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
});
