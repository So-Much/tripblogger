import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

type MyMemoryCardProps = {
  title: string;
  subtitle: string;
  icon: 'checkmark.circle.fill' | 'doc.text.fill' | 'photo.on.rectangle';
};

export function MyMemoryCard({ title, subtitle, icon }: MyMemoryCardProps) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <View style={[styles.card, { borderColor: border }]}>
      <IconSymbol name={icon} size={20} color={tint} />
      <View style={{ flex: 1 }}>
        <ThemedText numberOfLines={1} style={{ fontWeight: '700', fontSize: 13 }}>
          {title}
        </ThemedText>
        <ThemedText style={{ color: muted, fontSize: 11 }} numberOfLines={1}>
          {subtitle}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 160,
  },
});
