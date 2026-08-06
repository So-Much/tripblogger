import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { apiClient } from '@/src/services/api/client';
import { useMapStore } from '../store/map.store';
import { formatDistance } from '../utils/geo';

type SavedGroup = {
  collectionName: string;
  locations: { id: string; locationId: string }[];
};

export function PlaceDetailSheet() {
  const { t, language } = useI18n();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const onCta = useThemeColor({}, 'onCta');
  const border = useThemeColor({}, 'border');
  const place = useMapStore((s) => s.selectedPlace);
  const activeSheet = useMapStore((s) => s.activeSheet);
  const setActiveSheet = useMapStore((s) => s.setActiveSheet);
  const openDirectionsTo = useMapStore((s) => s.openDirectionsTo);
  const queryClient = useQueryClient();

  const savedQuery = useQuery({
    queryKey: ['saved-locations'],
    queryFn: async () => {
      const res = await apiClient.get<SavedGroup[]>('/saved-locations');
      return res.data;
    },
    enabled: activeSheet === 'place' && !!place && place.source === 'db',
    retry: false,
  });

  const savedRow = savedQuery.data
    ?.flatMap((g) => g.locations)
    .find((l) => l.locationId === place?.id);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!place || place.source !== 'db') throw new Error('not_db');
      if (savedRow) {
        await apiClient.delete(`/saved-locations/${savedRow.id}`);
        return;
      }
      await apiClient.post('/saved-locations', { locationId: place.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-locations'] }),
    onError: () => Alert.alert(t('errorTitle'), t('locationErrorGeneric')),
  });

  if (activeSheet !== 'place' || !place) return null;

  return (
    <View
      style={[
        styles.sheet,
        {
          backgroundColor: surface,
          paddingBottom: Math.max(insets.bottom, 12) + 64,
          borderColor: border,
        },
      ]}>
      <View style={[styles.handle, { backgroundColor: muted }]} />
      <Pressable onPress={() => setActiveSheet('explore')} style={styles.close} hitSlop={10}>
        <MaterialIcons name="close" size={22} color={muted} />
      </Pressable>
      <Text style={[styles.name, { color: text }]}>{place.name}</Text>
      {place.address ? (
        <Text style={[styles.addr, { color: muted }]}>{place.address}</Text>
      ) : null}
      <Text style={[styles.meta, { color: muted }]}>
        {[place.category, place.distanceM != null ? formatDistance(place.distanceM, language) : null]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, { backgroundColor: tint }]}
          onPress={() => openDirectionsTo(place)}>
          <MaterialIcons name="directions" size={20} color={onCta} />
          <Text style={[styles.btnText, { color: onCta }]}>{t('mapDirections')}</Text>
        </Pressable>
        <Pressable
          style={[styles.btnOutline, { borderColor: border }]}
          disabled={saveMutation.isPending}
          onPress={() => {
            if (place.source !== 'db') {
              Alert.alert(t('locationExternalHint'));
              return;
            }
            saveMutation.mutate();
          }}>
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={tint} />
          ) : (
            <MaterialIcons
              name={savedRow ? 'bookmark' : 'bookmark-border'}
              size={20}
              color={tint}
            />
          )}
          <Text style={[styles.btnOutlineText, { color: text }]}>
            {saveMutation.isPending
              ? t('mapLoadingSave')
              : savedRow
                ? t('locationSaved')
                : t('locationSave')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.btnOutline, { borderColor: border }]}
          onPress={() =>
            void Share.share({
              message: `${place.name}${place.address ? `\n${place.address}` : ''}\nhttps://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}`,
            })
          }>
          <MaterialIcons name="share" size={20} color={tint} />
          <Text style={[styles.btnOutlineText, { color: text }]}>{t('locationShare')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
    zIndex: 30,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  close: { position: 'absolute', right: 12, top: 12 },
  name: { fontSize: 20, fontWeight: '700', paddingRight: 28 },
  addr: { fontSize: 13 },
  meta: { fontSize: 12, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnText: { fontWeight: '700', fontSize: 14 },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnOutlineText: { fontWeight: '600', fontSize: 14 },
});
