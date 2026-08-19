import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColor } from '@/hooks/use-theme-color';
import { LocationTypeIcon } from '@/src/components/locations/LocationTypeIcon';
import { useI18n } from '@/src/i18n';
import { apiClient } from '@/src/services/api/client';
import { useAuthStore } from '@/src/store/auth.store';
import { resolvePlaceCategoryVisual } from '@/src/utils/location-type-display';
import { PlaceRatingLabel } from '../components/PlaceRatingLabel';
import { PlanAddDayPicker } from '../plan/PlanAddDayPicker';
import { useMapStore } from '../store/map.store';
import type { MapPlace } from '../types/map';
import { formatDistance } from '../utils/geo';

type SavedGroup = {
  collectionName: string;
  locations: { id: string; locationId: string }[];
};

type Props = {
  onDirections?: (place: MapPlace) => void;
};

export function PlaceDetailSheet({ onDirections }: Props) {
  const { t, language } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const onCta = useThemeColor({}, 'onCta');
  const border = useThemeColor({}, 'border');
  const place = useMapStore((s) => s.selectedPlace);
  const activeSheet = useMapStore((s) => s.activeSheet);
  const closePlace = useMapStore((s) => s.closePlace);
  const openDirectionsTo = useMapStore((s) => s.openDirectionsTo);
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.me);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);

  // Soft-hide like ExploreSheet: hard-unmount mid tag-switch races map markers.
  const lastPlaceRef = useRef<MapPlace | null>(place);
  useEffect(() => {
    if (place) lastPlaceRef.current = place;
  }, [place]);

  const displayPlace = place ?? lastPlaceRef.current;
  const visible = activeSheet === 'place' && !!place;

  const savedQuery = useQuery({
    queryKey: ['saved-locations'],
    queryFn: async () => {
      const res = await apiClient.get<SavedGroup[]>('/saved-locations');
      return res.data;
    },
    enabled: visible && !!place && place.source === 'db',
    retry: false,
  });

  const savedRow = savedQuery.data
    ?.flatMap((g) => g.locations)
    .find((l) => l.locationId === displayPlace?.id);

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

  if (!displayPlace) return null;

  const categoryVisual = resolvePlaceCategoryVisual(displayPlace.category);
  const hasCoords =
    Number.isFinite(displayPlace.lat) && Number.isFinite(displayPlace.lng);

  const openInGoogleMaps = () => {
    if (!hasCoords) return;
    const query = encodeURIComponent(
      `${displayPlace.name} ${displayPlace.lat},${displayPlace.lng}`,
    );
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert(t('errorTitle'), t('mapOpenInMapsFailed'));
    });
  };

  return (
    <View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.sheet,
        {
          backgroundColor: surface,
          paddingBottom: Math.max(insets.bottom, 12) + 64,
          borderColor: border,
          opacity: visible ? 1 : 0,
        },
      ]}>
      <View style={[styles.handle, { backgroundColor: muted }]} />
      <Pressable onPress={closePlace} style={styles.close} hitSlop={10}>
        <MaterialIcons name="close" size={22} color={muted} />
      </Pressable>
      <View style={styles.titleRow}>
        <LocationTypeIcon
          locationType={{
            code: displayPlace.category ?? 'other',
            name: categoryVisual.label,
          }}
          size="md"
        />
        <View style={styles.titleMeta}>
          <Text style={[styles.name, { color: text }]}>{displayPlace.name}</Text>
          {displayPlace.address ? (
            <Text style={[styles.addr, { color: muted }]}>{displayPlace.address}</Text>
          ) : null}
          <Text style={[styles.meta, { color: muted }]}>
            {[
              categoryVisual.label,
              displayPlace.distanceM != null
                ? formatDistance(displayPlace.distanceM, language)
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <PlaceRatingLabel
            rating={displayPlace.rating}
            reviewCount={displayPlace.reviewCount}
            size="md"
          />
        </View>
        <Pressable
          style={[
            styles.mapsIconBtn,
            { backgroundColor: `${tint}18`, opacity: hasCoords ? 1 : 0.4 },
          ]}
          disabled={!hasCoords || !visible}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('mapOpenInMaps')}
          onPress={openInGoogleMaps}>
          <MaterialIcons name="place" size={20} color={tint} />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.btn, { backgroundColor: tint }]}
          disabled={!visible}
          onPress={() => {
            if (!place) return;
            if (me?.role !== 'MEMBER') {
              Alert.alert(t('planGuestGateTitle'), t('planGuestGateBody'), [
                { text: t('cancel'), style: 'cancel' },
                {
                  text: t('planGuestGateCta'),
                  onPress: () => router.push('/login'),
                },
              ]);
              return;
            }
            setDayPickerOpen(true);
          }}>
          <MaterialIcons name="playlist-add" size={20} color={onCta} />
          <Text style={[styles.btnText, { color: onCta }]}>{t('planAddToPlan')}</Text>
        </Pressable>
        <Pressable
          style={[styles.btnOutline, { borderColor: border }]}
          disabled={!visible}
          onPress={() => {
            if (!place) return;
            if (onDirections) onDirections(place);
            else openDirectionsTo(place);
          }}>
          <MaterialIcons name="directions" size={20} color={tint} />
          <Text style={[styles.btnOutlineText, { color: text }]}>{t('mapDirections')}</Text>
        </Pressable>
        <Pressable
          style={[styles.btnOutline, { borderColor: border }]}
          disabled={!visible || saveMutation.isPending}
          onPress={() => {
            if (!place) return;
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
          disabled={!visible}
          onPress={() =>
            void Share.share({
              message: `${displayPlace.name}${displayPlace.address ? `\n${displayPlace.address}` : ''}\nhttps://www.openstreetmap.org/?mlat=${displayPlace.lat}&mlon=${displayPlace.lng}`,
            })
          }>
          <MaterialIcons name="share" size={20} color={tint} />
          <Text style={[styles.btnOutlineText, { color: text }]}>{t('locationShare')}</Text>
        </Pressable>
      </View>

      <PlanAddDayPicker
        visible={dayPickerOpen && visible}
        place={place}
        onClose={() => setDayPickerOpen(false)}
      />
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
    zIndex: 34,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  close: { position: 'absolute', right: 12, top: 12, zIndex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 28 },
  titleMeta: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontSize: 20, fontWeight: '700' },
  addr: { fontSize: 13 },
  meta: { fontSize: 12, marginBottom: 8 },
  mapsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 40 * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
