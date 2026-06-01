import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LocationNameLabel } from '@/src/components/locations/LocationNameLabel';
import { useThemeColor } from '@/hooks/use-theme-color';
import { locationsService } from '@/src/services/api/locations.service';
import { placesService } from '@/src/services/api/places.service';
import type { MapCheckpoint } from '@/src/types/trip-map';
import type { LocationTypeRef } from '@/src/utils/location-type-display';
import { formatApiError } from '@/src/utils/format-api-error';

type SearchResult = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  locationId?: string;
  locationType?: LocationTypeRef | null;
};

export type TripMapSearchBarHandle = {
  dismiss: () => void;
};

type TripMapSearchBarProps = {
  userLat?: number;
  userLng?: number;
  checkpoint: MapCheckpoint | null;
  onSelectCheckpoint: (checkpoint: MapCheckpoint) => void;
  onClearCheckpoint: () => void;
  onFocusChange?: (focused: boolean) => void;
};

export const TripMapSearchBar = forwardRef<TripMapSearchBarHandle, TripMapSearchBarProps>(
  function TripMapSearchBar(
    { userLat, userLng, checkpoint, onSelectCheckpoint, onClearCheckpoint, onFocusChange },
    ref,
  ) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<TextInputType>(null);

    const border = useThemeColor({}, 'border');
    const card = useThemeColor({}, 'card');
    const text = useThemeColor({}, 'text');
    const muted = useThemeColor({}, 'textMuted');
    const cta = useThemeColor({}, 'cta');

    const setSearchFocused = useCallback(
      (next: boolean) => {
        setFocused(next);
        onFocusChange?.(next);
      },
      [onFocusChange],
    );

    const dismiss = useCallback(() => {
      inputRef.current?.blur();
      Keyboard.dismiss();
      setResults([]);
      setSearchFocused(false);
    }, [setSearchFocused]);

    useImperativeHandle(ref, () => ({ dismiss }), [dismiss]);

    useEffect(() => {
      if (checkpoint) {
        setQuery(checkpoint.name);
      }
    }, [checkpoint]);

    const runSearch = useCallback(
      async (q: string) => {
        const trimmed = q.trim();
        if (trimmed.length < 2) {
          setResults([]);
          return;
        }
        setLoading(true);
        try {
          const [db, places] = await Promise.all([
            locationsService.search(trimmed, 10, userLat, userLng),
            placesService.search({ q: trimmed, lat: userLat, lng: userLng, limit: 8 }),
          ]);

          const merged: SearchResult[] = [];
          const seen = new Set<string>();

          for (const item of db) {
            const key = `${item.latitude.toFixed(4)}:${item.longitude.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push({
              id: item.id,
              name: item.name,
              address: item.address,
              lat: item.latitude,
              lng: item.longitude,
              locationId: item.id.startsWith('external:') ? undefined : item.id,
              locationType: item.locationType
                ? {
                    code: item.locationType.code,
                    name: item.locationType.name,
                    icon: item.locationType.icon,
                  }
                : null,
            });
          }

          for (const p of places) {
            const key = `${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push({
              id: `place:${p.source}:${p.id}`,
              name: p.name,
              address: p.address ?? null,
              lat: p.lat,
              lng: p.lng,
              locationType: { code: 'other', name: 'Địa điểm' },
            });
          }

          setResults(merged.slice(0, 15));
        } catch (e) {
          setResults([]);
          console.warn(formatApiError(e, 'Search failed'));
        } finally {
          setLoading(false);
        }
      },
      [userLat, userLng],
    );

    useEffect(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!focused) return;
      timerRef.current = setTimeout(() => {
        void runSearch(query);
      }, 300);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, [query, focused, runSearch]);

    const pick = (item: SearchResult) => {
      onSelectCheckpoint({
        lat: item.lat,
        lng: item.lng,
        name: item.name,
        locationId: item.locationId,
        locationType: item.locationType,
      });
      setQuery(item.name);
      dismiss();
    };

    return (
      <View style={styles.wrap}>
        <View style={[styles.pill, { borderColor: border, backgroundColor: `${card}F2` }]}>
          <IconSymbol name="magnifyingglass" size={18} color={muted} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: text }]}
            placeholder="Tìm địa điểm, nơi ở..."
            placeholderTextColor={muted}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onSubmitEditing={() => dismiss()}
            returnKeyType="search"
            blurOnSubmit
          />
          {loading ? <ActivityIndicator size="small" color={cta} /> : null}
          {focused ? (
            <Pressable onPress={dismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Đóng tìm kiếm">
              <ThemedText style={{ color: cta, fontWeight: '700', fontSize: 14 }}>Xong</ThemedText>
            </Pressable>
          ) : null}
          {!focused && checkpoint ? (
            <Pressable onPress={onClearCheckpoint} hitSlop={8} accessibilityRole="button">
              <IconSymbol name="xmark.circle.fill" size={18} color={muted} />
            </Pressable>
          ) : null}
        </View>

        {focused && results.length > 0 ? (
          <View style={[styles.dropdown, { borderColor: border, backgroundColor: card }]}>
            <FlatList
              keyboardShouldPersistTaps="always"
              data={results}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => pick(item)}>
                  <LocationNameLabel
                    name={item.name}
                    locationType={item.locationType}
                    variant="dense"
                    subtitle={item.address}
                  />
                </Pressable>
              )}
            />
          </View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    zIndex: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    maxHeight: 260,
    overflow: 'hidden',
  },
  list: {
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
