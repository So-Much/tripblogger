import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';

interface HomeSearchBarProps {
  hint?: string;
  onPress?: () => void;
}

export function HomeSearchBar({ hint, onPress }: HomeSearchBarProps) {
  const { t } = useI18n();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Search"
      style={({ pressed }) => [
        styles.bar,
        { borderColor: border, backgroundColor: card },
        pressed && styles.barPressed,
      ]}
      hitSlop={{ top: 2, bottom: 2 }}
    >
      <IconSymbol size={22} name="magnifyingglass" color={muted} />
      <ThemedText style={[styles.placeholder, { color: muted }]} numberOfLines={1}>
        {hint ?? t('homeSearchHint')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  barPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.994 }],
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    minWidth: 0,
  },
});
