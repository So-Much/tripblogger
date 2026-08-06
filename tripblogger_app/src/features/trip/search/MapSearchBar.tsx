import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
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
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const setSearchOpen = useMapStore((s) => s.setSearchOpen);
  const setActiveSheet = useMapStore((s) => s.setActiveSheet);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingLeft: 52 }]} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: surface, borderColor: border }]}>
        <MaterialIcons name="search" size={22} color={muted} />
        <TextInput
          value={query}
          onChangeText={(v) => {
            setSearchQuery(v);
            setSearchOpen(true);
            setActiveSheet('search');
          }}
          onFocus={() => {
            setSearchOpen(true);
            setActiveSheet('search');
          }}
          placeholder={t('mapSearchPlaceholder')}
          placeholderTextColor={muted}
          style={[styles.input, { color: text }]}
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading ? <ActivityIndicator size="small" color={muted} /> : null}
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setSearchQuery('');
              setSearchOpen(false);
            }}
            hitSlop={8}
            accessibilityLabel={t('close')}>
            <MaterialIcons name="close" size={20} color={muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 12,
    zIndex: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
});
