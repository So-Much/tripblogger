import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useMapStore } from '../store/map.store';

type Props = {
  loading?: boolean;
};

export function MapSearchBar({ loading }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const query = useMapStore((s) => s.searchQuery);
  const setSearchOpen = useMapStore((s) => s.setSearchOpen);
  const setActiveSheet = useMapStore((s) => s.setActiveSheet);
  const label = t('mapSearchPlaceholder');

  const openFocus = () => {
    setSearchOpen(true);
    setActiveSheet('search');
  };

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + 8, paddingLeft: 52 }]}
      pointerEvents="box-none">
      <Pressable
        onPress={openFocus}
        accessibilityRole="search"
        accessibilityLabel={label}
        style={[styles.pill, { backgroundColor: surface, borderColor: border }]}>
        <MaterialIcons name="search" size={22} color={muted} />
        <Text numberOfLines={1} style={[styles.input, { color: query ? text : muted }]}>
          {query || label}
        </Text>
        {loading ? <ActivityIndicator size="small" color={muted} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 12,
    zIndex: 31,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
  },
});
