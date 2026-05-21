import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useI18n } from '@/src/i18n';

const ACTION_ICONS: Record<string, IconSymbolName> = {
  feed: 'house.fill',
  shop: 'cart.fill',
  live: 'video.fill',
  inbox: 'envelope.fill',
};

export function QuickActionsStrip({ onActionPress }: { onActionPress?: (key: string) => void }) {
  const { t } = useI18n();
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const accent = useThemeColor({}, 'accent');

  const actions = [
    { key: 'feed', label: t('homeQuickFeed') },
    { key: 'shop', label: t('homeQuickShop') },
    { key: 'live', label: t('homeQuickLive') },
    { key: 'inbox', label: t('homeQuickInbox') },
  ];

  return (
    <View style={styles.row}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={() => onActionPress?.(a.key)}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: card, borderColor: border },
            pressed && styles.chipPressed,
          ]}
          hitSlop={{ top: 4, bottom: 4 }}
        >
          <IconSymbol size={18} name={ACTION_ICONS[a.key]} color={accent} />
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
