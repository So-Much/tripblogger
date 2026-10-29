import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
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
import { mapService } from '../services/map.service';
import { useMapStore } from '../store/map.store';
import type { MapPlace, PlaceDetail } from '../types/map';
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

  const detailQuery = useQuery({
    queryKey: ['places', 'detail', displayPlace?.id],
    queryFn: ({ signal }) => mapService.getPlaceDetail(displayPlace!.id, signal),
    enabled: visible && !!displayPlace && displayPlace.source === 'db',
    staleTime: 60_000,
    retry: false,
  });

  const detail: PlaceDetail | null =
    detailQuery.data ??
    (displayPlace
      ? {
          ...displayPlace,
          phone: displayPlace.phone ?? null,
          website: displayPlace.website ?? null,
          imageUrl: displayPlace.imageUrl ?? null,
          reviews: [],
          isOpenNow: null,
        }
      : null);

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

  if (!displayPlace || !detail) return null;

  const categoryVisual = resolvePlaceCategoryVisual(detail.category);
  const hasCoords = Number.isFinite(detail.lat) && Number.isFinite(detail.lng);
  const phone = detail.phone ?? null;
  const website = detail.website ?? null;
  const imageUrl = detail.imageUrl ?? null;
  const hours = detail.openingHours ?? null;
  const openStatus = detailQuery.data?.isOpenNow ?? null;
  const reviews = detailQuery.data?.reviews?.slice(0, 5) ?? [];

  const openInGoogleMaps = () => {
    if (!hasCoords) return;
    const query = encodeURIComponent(`${detail.name} ${detail.lat},${detail.lng}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert(t('errorTitle'), t('mapOpenInMapsFailed'));
    });
  };

  const callPlace = () => {
    if (!phone) return;
    void Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert(t('errorTitle'), t('locationErrorGeneric'));
    });
  };

  const openWebsite = () => {
    if (!website) return;
    const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    void Linking.openURL(url).catch(() => {
      Alert.alert(t('errorTitle'), t('locationErrorGeneric'));
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: `${tint}14`, borderColor: border }]}>
            <MaterialIcons name="photo" size={28} color={muted} />
            <Text style={[styles.heroPlaceholderText, { color: muted }]}>{t('mapNoPhoto')}</Text>
          </View>
        )}

        <View style={styles.titleRow}>
          <LocationTypeIcon
            locationType={{
              code: detail.category ?? 'other',
              name: categoryVisual.label,
            }}
            size="md"
          />
          <View style={styles.titleMeta}>
            <Text style={[styles.name, { color: text }]}>{detail.name}</Text>
            {detail.address ? (
              <Text style={[styles.addr, { color: muted }]}>{detail.address}</Text>
            ) : null}
            <Text style={[styles.meta, { color: muted }]}>
              {[
                categoryVisual.label,
                detail.distanceM != null ? formatDistance(detail.distanceM, language) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <PlaceRatingLabel rating={detail.rating} reviewCount={detail.reviewCount} size="md" />
            {openStatus != null || hours ? (
              <View style={styles.hoursRow}>
                {openStatus != null ? (
                  <View
                    style={[
                      styles.openChip,
                      { backgroundColor: openStatus ? '#DCFCE7' : '#FEE2E2' },
                    ]}>
                    <Text
                      style={[
                        styles.openChipText,
                        { color: openStatus ? '#166534' : '#991B1B' },
                      ]}>
                      {openStatus ? t('mapOpenNow') : t('mapClosed')}
                    </Text>
                  </View>
                ) : null}
                {hours ? (
                  <Text style={[styles.hoursText, { color: muted }]} numberOfLines={2}>
                    {hours}
                  </Text>
                ) : null}
              </View>
            ) : null}
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

        {(phone || website) && (
          <View style={styles.quickActions}>
            {phone ? (
              <Pressable
                style={[styles.quickBtn, { borderColor: border }]}
                disabled={!visible}
                onPress={callPlace}
                accessibilityRole="button"
                accessibilityLabel={t('mapCall')}>
                <MaterialIcons name="call" size={18} color={tint} />
                <Text style={[styles.quickBtnText, { color: text }]}>{t('mapCall')}</Text>
              </Pressable>
            ) : null}
            {website ? (
              <Pressable
                style={[styles.quickBtn, { borderColor: border }]}
                disabled={!visible}
                onPress={openWebsite}
                accessibilityRole="button"
                accessibilityLabel={t('mapWebsite')}>
                <MaterialIcons name="language" size={18} color={tint} />
                <Text style={[styles.quickBtnText, { color: text }]}>{t('mapWebsite')}</Text>
              </Pressable>
            ) : null}
          </View>
        )}

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
            onPress={() => {
              if (!place) return;
              void apiClient
                .post(`/places/${place.id}/suggestions`, { address: place.address ?? undefined })
                .then(() => Alert.alert(t('mapContributeThanks')))
                .catch(() => Alert.alert(t('errorTitle'), t('locationErrorGeneric')));
            }}>
            <MaterialIcons name="edit-note" size={20} color={tint} />
            <Text style={[styles.btnOutlineText, { color: text }]}>{t('mapSuggestEdit')}</Text>
          </Pressable>
          <Pressable
            style={[styles.btnOutline, { borderColor: border }]}
            disabled={!visible}
            onPress={() =>
              void Share.share({
                message: `${detail.name}${detail.address ? `\n${detail.address}` : ''}\nhttps://www.openstreetmap.org/?mlat=${detail.lat}&mlon=${detail.lng}`,
              })
            }>
            <MaterialIcons name="share" size={20} color={tint} />
            <Text style={[styles.btnOutlineText, { color: text }]}>{t('locationShare')}</Text>
          </Pressable>
        </View>

        {displayPlace.source === 'db' ? (
          <View style={styles.reviewsBlock}>
            <Text style={[styles.reviewsTitle, { color: text }]}>{t('mapReviews')}</Text>
            {detailQuery.isLoading ? (
              <ActivityIndicator size="small" color={tint} />
            ) : reviews.length === 0 ? (
              <Text style={[styles.reviewEmpty, { color: muted }]}>{t('mapReviewsEmpty')}</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={[styles.reviewRow, { borderColor: border }]}>
                  <Text style={[styles.reviewRating, { color: text }]}>
                    {'★'.repeat(Math.max(1, Math.min(5, r.rating)))}
                  </Text>
                  {r.body ? (
                    <Text style={[styles.reviewBody, { color: muted }]} numberOfLines={3}>
                      {r.body}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

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
    maxHeight: '72%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    zIndex: 34,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  close: { position: 'absolute', right: 12, top: 12, zIndex: 2 },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: 10, paddingBottom: 8 },
  hero: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  heroPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  heroPlaceholderText: { fontSize: 12, fontWeight: '500' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 28 },
  titleMeta: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontSize: 20, fontWeight: '700' },
  addr: { fontSize: 13 },
  meta: { fontSize: 12, marginBottom: 4 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  openChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  openChipText: { fontSize: 12, fontWeight: '700' },
  hoursText: { fontSize: 12, flexShrink: 1 },
  mapsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 40 * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickBtnText: { fontWeight: '600', fontSize: 13 },
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
  reviewsBlock: { gap: 8, marginTop: 4 },
  reviewsTitle: { fontSize: 15, fontWeight: '700' },
  reviewEmpty: { fontSize: 13 },
  reviewRow: {
    gap: 2,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reviewRating: { fontSize: 13, fontWeight: '600' },
  reviewBody: { fontSize: 13, lineHeight: 18 },
});
