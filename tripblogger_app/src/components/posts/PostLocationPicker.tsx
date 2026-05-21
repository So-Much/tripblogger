import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { placesService } from '@/src/services/api/places.service';
import type { ComposerLocation, PlaceDto } from '@/src/types/place';
import { ComposerBottomSheet } from '@/src/components/posts/ComposerBottomSheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { formatApiError } from '@/src/utils/format-api-error';

type PostLocationPickerProps = {
  value: ComposerLocation | null;
  onChange: (location: ComposerLocation | null) => void;
};

export function PostLocationPicker({ value, onChange }: PostLocationPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceDto[]>([]);
  const [nearby, setNearby] = useState<PlaceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');

  const refreshPermission = useCallback(async () => {
    const current = await Location.getForegroundPermissionsAsync();
    setPermission(current.status);
    return current.status;
  }, []);

  const loadNearby = useCallback(async () => {
    setNearbyLoading(true);
    setError(null);
    try {
      let coords = coordsRef.current;
      if (!coords) {
        const status = await refreshPermission();
        if (status !== Location.PermissionStatus.GRANTED) {
          setNearby([]);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        coordsRef.current = coords;
      }
      const items = await placesService.nearby({ lat: coords.lat, lng: coords.lng, limit: 8 });
      setNearby(items);
    } catch (e) {
      setError(formatApiError(e, t('postsLocationSearchError')));
    } finally {
      setNearbyLoading(false);
    }
  }, [refreshPermission, t]);

  useEffect(() => {
    if (!open) return;
    void refreshPermission();
    void loadNearby();
  }, [open, loadNearby, refreshPermission]);

  useEffect(() => {
    if (!open) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      void placesService
        .search({
          q,
          lat: coordsRef.current?.lat,
          lng: coordsRef.current?.lng,
          limit: 12,
        })
        .then(setResults)
        .catch((e) => setError(formatApiError(e, t('postsLocationSearchError'))))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [open, query, t]);

  const requestPermission = async () => {
    const res = await Location.requestForegroundPermissionsAsync();
    setPermission(res.status);
    if (res.status === Location.PermissionStatus.GRANTED) {
      coordsRef.current = null;
      await loadNearby();
      return;
    }
    if (!res.canAskAgain) {
      await Linking.openSettings();
    }
  };

  const selectPlace = (place: PlaceDto) => {
    onChange({ name: place.name, lat: place.lat, lng: place.lng });
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const renderPlace = ({ item }: { item: PlaceDto }) => (
    <Pressable
      onPress={() => selectPlace(item)}
      style={[styles.placeRow, { borderColor: border, backgroundColor: card }]}
      accessibilityRole="button">
      <IconSymbol name="mappin.circle.fill" size={20} color={cta} />
      <View style={styles.placeText}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {item.name}
        </ThemedText>
        {item.address ? (
          <ThemedText style={[styles.placeAddr, { color: muted }]} numberOfLines={2}>
            {item.address}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );

  const listData = query.trim().length >= 2 ? results : nearby;
  const showNearbyHeader = query.trim().length < 2;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: border, backgroundColor: card }]}
        accessibilityRole="button">
        <View style={styles.triggerText}>
          <ThemedText style={[styles.triggerLabel, { color: muted }]}>{t('postsLocationLabel')}</ThemedText>
          <ThemedText style={{ color: value ? text : muted }} numberOfLines={1}>
            {value?.name ?? t('postsLocationPlaceholder')}
          </ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={muted} />
      </Pressable>

      {value ? (
        <Pressable onPress={() => onChange(null)} style={styles.clearBtn} hitSlop={8}>
          <ThemedText style={{ color: cta, fontSize: 13 }}>{t('postsLocationClear')}</ThemedText>
        </Pressable>
      ) : null}

      <ComposerBottomSheet
        visible={open}
        title={t('postsLocationSheetTitle')}
        onClose={() => setOpen(false)}
        contentStyle={{ flex: 1, minHeight: 280 }}>
        {permission !== Location.PermissionStatus.GRANTED ? (
          <Pressable onPress={() => void requestPermission()} style={[styles.nearMeBtn, { borderColor: border }]}>
            <IconSymbol name="location.fill" size={18} color={cta} />
            <View style={styles.nearMeText}>
              <ThemedText type="defaultSemiBold">{t('postsLocationNearMe')}</ThemedText>
              <ThemedText style={{ color: muted, fontSize: 12 }}>{t('postsLocationPermissionBody')}</ThemedText>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => void loadNearby()}
            style={[styles.nearMeBtn, { borderColor: border }]}
            disabled={nearbyLoading}>
            {nearbyLoading ? (
              <ActivityIndicator size="small" color={cta} />
            ) : (
              <IconSymbol name="location.fill" size={18} color={cta} />
            )}
            <ThemedText type="defaultSemiBold">{t('postsLocationNearMe')}</ThemedText>
          </Pressable>
        )}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('postsLocationSearchPlaceholder')}
          placeholderTextColor={muted}
          style={[styles.searchInput, { borderColor: border, color: text, backgroundColor: card }]}
          autoCorrect={false}
        />

        {error ? (
          <ThemedText style={styles.err} lightColor="#c00" darkColor="#f66">
            {error}
          </ThemedText>
        ) : null}

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 16 }} />
        ) : (
          <>
            {showNearbyHeader && nearby.length > 0 ? (
              <ThemedText style={[styles.sectionLabel, { color: muted }]}>
                {permission === Location.PermissionStatus.GRANTED ? t('postsLocationNearMe') : ''}
              </ThemedText>
            ) : null}
            <FlatList
              data={listData}
              keyExtractor={(item) => item.id}
              renderItem={renderPlace}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                !loading && !nearbyLoading ? (
                  <ThemedText style={{ color: muted, textAlign: 'center', marginTop: 24 }}>
                    {query.trim().length >= 2 ? t('postsLocationNoResults') : t('postsLocationSearchHint')}
                  </ThemedText>
                ) : null
              }
              style={styles.list}
            />
          </>
        )}
      </ComposerBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  triggerText: { flex: 1, gap: 2, minWidth: 0 },
  triggerLabel: { fontSize: 12 },
  clearBtn: { alignSelf: 'flex-start', marginTop: -4, marginBottom: 4 },
  nearMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  nearMeText: { flex: 1, gap: 2 },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  sectionLabel: { fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  list: { maxHeight: 320 },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  placeText: { flex: 1, gap: 2, minWidth: 0 },
  placeAddr: { fontSize: 12, lineHeight: 16 },
  err: { marginBottom: 8, fontSize: 13 },
});
