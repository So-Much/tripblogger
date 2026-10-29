import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { useMapStore } from '../store/map.store';
import { SearchEmptyState } from './SearchEmptyState';
import { SearchResultsList } from './SearchResultsList';
import type { MapPlace } from '../types/map';

type Props = {
  onSelect: (place: MapPlace) => void;
  loading?: boolean;
  error?: boolean;
};

export function SearchFocusView({ onSelect, loading, error }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  const searchOpen = useMapStore((s) => s.searchOpen);
  const activeSheet = useMapStore((s) => s.activeSheet);
  const query = useMapStore((s) => s.searchQuery);
  const setSearchQuery = useMapStore((s) => s.setSearchQuery);
  const setSearchOpen = useMapStore((s) => s.setSearchOpen);
  const setActiveSheet = useMapStore((s) => s.setActiveSheet);

  const inputRef = useRef<TextInput>(null);
  const visible = searchOpen && activeSheet === 'search';

  useEffect(() => {
    if (visible) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [visible]);

  if (!visible) return null;

  const exitFocus = () => {
    inputRef.current?.blur();
    setSearchOpen(false);
    // Return to the map without a lingering 'search' sheet; keep other sheets intact.
    if (useMapStore.getState().activeSheet === 'search') setActiveSheet('none');
  };

  const searching = query.trim().length >= 2;
  const placeholder = t('mapSearchPlaceholder');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, backgroundColor: surface }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable onPress={exitFocus} hitSlop={8} accessibilityLabel={t('mapSearchBack')}>
          <MaterialIcons name="arrow-back" size={24} color={text} />
        </Pressable>
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setSearchQuery}
          placeholder={placeholder}
          placeholderTextColor={muted}
          style={[styles.input, { color: text }]}
          cursorColor={tint}
          selectionColor={tint}
          returnKeyType="search"
          autoCorrect={false}
          autoFocus
        />
        {loading ? <ActivityIndicator size="small" color={muted} /> : null}
        {query.length > 0 ? (
          <Pressable
            onPress={() => setSearchQuery('')}
            hitSlop={8}
            accessibilityLabel={t('close')}>
            <MaterialIcons name="close" size={22} color={muted} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {searching ? (
          <SearchResultsList onSelect={onSelect} loading={loading} error={error} />
        ) : (
          <SearchEmptyState onSelectRecent={onSelect} />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 35,
    elevation: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 0,
  },
  body: { flex: 1 },
});
