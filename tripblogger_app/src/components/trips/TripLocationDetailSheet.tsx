import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LocationNameLabel } from '@/src/components/locations/LocationNameLabel';
import { LocationPhotoGrid } from '@/src/components/locations/LocationPhotoGrid';
import { RatingSummary } from '@/src/components/locations/RatingSummary';
import { ReviewFilters } from '@/src/components/locations/ReviewFilters';
import { ReviewTagCloud } from '@/src/components/locations/ReviewTagCloud';
import { SimilarNearby } from '@/src/components/locations/SimilarNearby';
import { LocationReviewCard } from '@/src/components/locations/cards/LocationReviewCard';
import { MyMemoryCard } from '@/src/components/locations/cards/MyMemoryCard';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import { checkinsService } from '@/src/services/api/checkins.service';
import { locationsService } from '@/src/services/api/locations.service';
import { postsService } from '@/src/services/api/posts.service';
import { reviewsService } from '@/src/services/api/reviews.service';
import { savedLocationsService } from '@/src/services/api/saved-locations.service';
import { locationKeys } from '@/src/services/queries/location-keys';
import type { MapExplorePin } from '@/src/types/trip-map';
import { formatApiError } from '@/src/utils/format-api-error';
import { isPersistedLocationId, parseExternalPinId } from '@/src/utils/location-id';

type TripLocationDetailSheetProps = {
  visible: boolean;
  pin: MapExplorePin | null;
  isMember?: boolean;
  chainIndex?: number | null;
  hasAnchor: boolean;
  tripId?: string | null;
  tripDayLabel?: string | null;
  onClose: () => void;
  onSetAnchor: () => void;
  onAddToRoute: () => void;
  onRemoveFromRoute?: () => void;
  onDirections: () => void;
  onPinResolved?: (pin: MapExplorePin) => void;
};

type ActionKey = 'directions' | 'add' | 'anchor' | 'remove' | 'save' | 'checkin' | 'share';

export function TripLocationDetailSheet({
  visible,
  pin,
  isMember = true,
  chainIndex,
  hasAnchor,
  tripId,
  tripDayLabel,
  onClose,
  onSetAnchor,
  onAddToRoute,
  onRemoveFromRoute,
  onDirections,
  onPinResolved,
}: TripLocationDetailSheetProps) {
  const router = useRouter();
  const { t } = useI18n();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const windowH = Dimensions.get('window').height;
  const [snapIndex, setSnapIndex] = useState(0);
  const snapHeights = [0.25, 0.55, 0.9];
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');
  const text = useThemeColor({}, 'text');

  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [reviewSort, setReviewSort] = useState<'recent' | 'rating'>('recent');
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');

  const locationId = pin && isPersistedLocationId(pin.id) ? pin.id : resolvedId;

  useEffect(() => {
    if (!pin) {
      setResolvedId(null);
      return;
    }
    if (isPersistedLocationId(pin.id)) {
      setResolvedId(pin.id);
    } else {
      setResolvedId(null);
    }
  }, [pin?.id]);

  useEffect(() => {
    if (visible) {
      setSnapIndex(0);
    } else {
      setReviewFormOpen(false);
    }
  }, [visible]);

  const detailQuery = useQuery({
    queryKey: locationKeys.detail(locationId ?? ''),
    queryFn: () => locationsService.getById(locationId!),
    enabled: Boolean(locationId && visible),
    staleTime: 2 * 60_000,
  });

  const mediaQuery = useQuery({
    queryKey: locationKeys.media(locationId ?? ''),
    queryFn: () => locationsService.listMedia(locationId!),
    enabled: Boolean(locationId && visible),
    staleTime: 10 * 60_000,
  });

  const summaryQuery = useQuery({
    queryKey: locationKeys.reviewSummary(locationId ?? ''),
    queryFn: () => reviewsService.summary(locationId!),
    enabled: Boolean(locationId && visible),
    staleTime: 5 * 60_000,
  });

  const myReviewQuery = useQuery({
    queryKey: locationKeys.myReview(locationId ?? ''),
    queryFn: () => reviewsService.mine(locationId!),
    enabled: Boolean(locationId && visible),
  });

  const reviewsQuery = useInfiniteQuery({
    queryKey: locationKeys.reviews(locationId ?? '', reviewSort),
    queryFn: ({ pageParam }) =>
      reviewsService.list(locationId!, { sort: reviewSort, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: Boolean(locationId && visible),
    maxPages: 5,
  });

  const postsQuery = useQuery({
    queryKey: locationKeys.myMemories(locationId ?? ''),
    queryFn: () =>
      postsService.listMineNear({
        locationId: locationId!,
        limit: 10,
      }),
    enabled: Boolean(locationId && visible),
  });

  const checkinsQuery = useQuery({
    queryKey: locationKeys.myCheckins(locationId ?? ''),
    queryFn: () => checkinsService.listMine({ locationId: locationId!, limit: 10 }),
    enabled: Boolean(locationId && visible),
  });

  const nearbyQuery = useQuery({
    queryKey: locationKeys.nearby(
      pin?.latitude ?? 0,
      pin?.longitude ?? 0,
      3,
    ),
    queryFn: () =>
      locationsService.nearby({
        lat: pin!.latitude,
        lng: pin!.longitude,
        radiusKm: 3,
        limit: 5,
        sort: 'rating',
      }),
    enabled: Boolean(pin && visible && locationId),
    select: (data) => data.filter((d) => d.id !== locationId).slice(0, 4),
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!pin) throw new Error('no pin');
      const ext = parseExternalPinId(pin.id);
      if (!ext) throw new Error('not external');
      return locationsService.upsertFromPlace({
        placeId: ext.placeId,
        name: pin.name,
        address: pin.address ?? undefined,
        lat: pin.latitude,
        lng: pin.longitude,
        source: ext.source,
      });
    },
    onSuccess: (loc) => {
      setResolvedId(loc.id);
      const nextPin: MapExplorePin = {
        ...pin!,
        id: loc.id,
        address: loc.address,
        avgRating: loc.avgRating ?? 0,
        totalReview: loc.totalReview ?? 0,
      };
      onPinResolved?.(nextPin);
      void qc.invalidateQueries({ queryKey: locationKeys.detail(loc.id) });
    },
    onError: (e) => Alert.alert(t('locationErrorTitle'), formatApiError(e, t('locationErrorGeneric'))),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const detail = detailQuery.data;
      if (!locationId) throw new Error('no id');
      if (detail?.savedByMe && detail.savedLocationId) {
        await savedLocationsService.remove(detail.savedLocationId);
        return { saved: false as const };
      }
      await savedLocationsService.save({ locationId });
      return { saved: true as const };
    },
    onSuccess: () => {
      if (locationId) void qc.invalidateQueries({ queryKey: locationKeys.detail(locationId) });
    },
    onError: (e) => Alert.alert(t('locationErrorTitle'), formatApiError(e, t('locationErrorGeneric'))),
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!locationId) throw new Error('no id');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('location denied');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return checkinsService.create({
        locationId,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    },
    onSuccess: () => {
      if (locationId) {
        void qc.invalidateQueries({ queryKey: locationKeys.myCheckins(locationId) });
      }
      Alert.alert(t('locationCheckinSuccessTitle'), t('locationCheckinSuccessBody'));
    },
    onError: (e) => Alert.alert(t('locationErrorTitle'), formatApiError(e, t('locationCheckinFailed'))),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!locationId) throw new Error('no id');
      const existing = myReviewQuery.data;
      if (existing) {
        return reviewsService.update(locationId, existing.id, {
          rating: reviewRating,
          content: reviewContent.trim() || undefined,
        });
      }
      return reviewsService.create(locationId, {
        rating: reviewRating,
        content: reviewContent.trim() || undefined,
        tripId: tripId ?? undefined,
      });
    },
    onSuccess: () => {
      setReviewFormOpen(false);
      if (locationId) {
        void qc.invalidateQueries({ queryKey: locationKeys.detail(locationId) });
        void qc.invalidateQueries({ queryKey: locationKeys.myReview(locationId) });
        void qc.invalidateQueries({ queryKey: locationKeys.reviewSummary(locationId) });
        void qc.invalidateQueries({ queryKey: locationKeys.reviews(locationId, reviewSort) });
      }
    },
    onError: (e) => Alert.alert(t('locationErrorTitle'), formatApiError(e, t('locationReviewFailed'))),
  });

  const handleShare = useCallback(async () => {
    if (!pin) return;
    const url = `tripblogger://location/${locationId ?? pin.id}`;
    try {
      await Share.share({
        message: `${pin.name}\n${url}`,
        title: pin.name,
      });
    } catch {
      // user cancelled
    }
  }, [pin, locationId]);

  if (!pin) return null;

  const isExternal = !isPersistedLocationId(pin.id) && !resolvedId;
  const inChain = chainIndex != null && chainIndex >= 0;
  const isStart = inChain && chainIndex === 0;
  const detail = detailQuery.data;
  const metaParts: string[] = [];
  if (pin.distanceKm != null) metaParts.push(`${pin.distanceKm.toFixed(1)} km`);
  if ((detail?.avgRating ?? pin.avgRating) > 0) {
    metaParts.push(`★${(detail?.avgRating ?? pin.avgRating).toFixed(1)}`);
  }
  if (detail?.priceLevel != null) metaParts.push('$'.repeat(detail.priceLevel));

  const reviewItems = reviewsQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const actions: {
    key: ActionKey;
    label: string;
    icon: 'location.fill' | 'plus.circle.fill' | 'mappin.circle.fill' | 'trash.fill' | 'bookmark.fill' | 'checkmark.circle.fill' | 'square.and.arrow.up';
    onPress: () => void;
    disabled?: boolean;
    danger?: boolean;
    active?: boolean;
  }[] = [];

  if (!isExternal) {
    actions.push({
      key: 'directions',
      label: t('tripDirectionsShort'),
      icon: 'location.fill',
      onPress: onDirections,
    });
    if (isMember) {
      actions.push({
        key: 'checkin',
        label: t('locationCheckin'),
        icon: 'checkmark.circle.fill',
        onPress: () => checkinMutation.mutate(),
        disabled: checkinMutation.isPending,
      });
      actions.push({
        key: 'save',
        label: detail?.savedByMe ? t('locationSaved') : t('locationSave'),
        icon: 'bookmark.fill',
        onPress: () => saveMutation.mutate(),
        disabled: saveMutation.isPending,
        active: detail?.savedByMe,
      });
    }
    actions.push({
      key: 'share',
      label: t('locationShare'),
      icon: 'square.and.arrow.up',
      onPress: () => void handleShare(),
    });

    if (inChain && !isStart) {
      actions.push({
        key: 'remove',
        label: t('tripRemoveRoute'),
        icon: 'trash.fill',
        onPress: () => onRemoveFromRoute?.(),
        danger: true,
      });
    } else if (!inChain) {
      const addLabel = tripDayLabel ? t('locationAddToDay', { day: tripDayLabel }) : t('tripAddRoute');
      actions.push({
        key: 'add',
        label: addLabel,
        icon: 'plus.circle.fill',
        onPress: onAddToRoute,
      });
      if (!hasAnchor) {
        actions.push({
          key: 'anchor',
          label: t('tripAnchorSet'),
          icon: 'mappin.circle.fill',
          onPress: onSetAnchor,
        });
      } else {
        if (!isStart) {
          actions.push({
            key: 'anchor',
            label: t('tripAnchorSet'),
            icon: 'mappin.circle.fill',
            onPress: onSetAnchor,
          });
        }
      }
    }
  }

  const openHoursLine =
    detail?.openHours && typeof detail.openHours === 'object'
      ? JSON.stringify(detail.openHours).slice(0, 80)
      : null;

  const sheetMaxHeight = windowH * snapHeights[snapIndex];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: card,
              borderColor: border,
              maxHeight: sheetMaxHeight,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <Pressable
            onPress={() => setSnapIndex((i) => (i + 1) % snapHeights.length)}
            style={styles.handleHit}
            accessibilityLabel="Expand sheet">
            <View style={[styles.handle, { backgroundColor: muted }]} />
          </Pressable>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={snapIndex >= 1}
            bounces={snapIndex >= 2}>
        <LocationNameLabel
          name={pin.name}
          locationType={pin.locationType}
          variant="dense"
          subtitle={metaParts.length ? metaParts.join(' · ') : null}
        />

        {isExternal ? (
          <View style={styles.externalBox}>
            <ThemedText style={{ color: muted, fontSize: 13 }}>{t('locationExternalHint')}</ThemedText>
            <PressableScale
              style={[styles.primaryBtn, { backgroundColor: cta }]}
              onPress={() => upsertMutation.mutate()}
              disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <ActivityIndicator color={onCta} />
              ) : (
                <ThemedText style={{ color: onCta, fontWeight: '700' }}>{t('locationAddToTripBlogger')}</ThemedText>
              )}
            </PressableScale>
          </View>
        ) : (
          <>
            {inChain ? (
              <ThemedText style={{ color: tint, fontSize: 12, fontWeight: '700' }}>
                {t('tripChainStopBadge', { index: chainIndex! + 1 })}
              </ThemedText>
            ) : !hasAnchor && !tripId ? (
              <ThemedText style={{ color: muted, fontSize: 12 }}>{t('tripPickAnchorFirst')}</ThemedText>
            ) : null}

            <View style={styles.actionRow}>
              {actions.map((a) => (
                <PressableScale
                  key={a.key}
                  style={styles.actionCell}
                  onPress={a.onPress}
                  disabled={a.disabled}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        borderColor: a.danger ? '#c0392b' : a.active ? tint : border,
                        backgroundColor: a.key === 'add' ? cta : a.active ? `${tint}18` : `${tint}10`,
                      },
                    ]}>
                    <IconSymbol
                      name={a.icon}
                      size={20}
                      color={a.danger ? '#c0392b' : a.key === 'add' ? onCta : tint}
                    />
                  </View>
                  <ThemedText
                    style={[
                      styles.actionLabel,
                      { color: a.danger ? '#c0392b' : muted },
                      (a.key === 'add' || a.active) && { color: tint, fontWeight: '700' },
                    ]}
                    numberOfLines={1}>
                    {a.label}
                  </ThemedText>
                </PressableScale>
              ))}
            </View>

            {detailQuery.isLoading ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={tint} />
            ) : null}

            {detail?.address ? (
              <ThemedText style={{ color: muted, fontSize: 13 }}>{detail.address}</ThemedText>
            ) : null}
            {openHoursLine ? (
              <ThemedText style={{ color: muted, fontSize: 12 }}>{openHoursLine}</ThemedText>
            ) : null}
            {detail?.phone ? (
              <PressableScale onPress={() => void Linking.openURL(`tel:${detail.phone}`)}>
                <ThemedText style={{ color: tint, fontSize: 13 }}>{detail.phone}</ThemedText>
              </PressableScale>
            ) : null}
            {detail?.website ? (
              <PressableScale onPress={() => void Linking.openURL(detail.website!)}>
                <ThemedText style={{ color: tint, fontSize: 13 }} numberOfLines={1}>
                  {detail.website}
                </ThemedText>
              </PressableScale>
            ) : null}

            {mediaQuery.data?.items.length ? (
              <LocationPhotoGrid items={mediaQuery.data.items} />
            ) : null}

            <ThemedText style={styles.sectionTitle}>{t('locationSectionMine')}</ThemedText>
            <View style={styles.memoryRow}>
              {(checkinsQuery.data?.items ?? []).slice(0, 3).map((c) => (
                <MyMemoryCard
                  key={c.id}
                  icon="checkmark.circle.fill"
                  title={t('locationMyCheckin')}
                  subtitle={new Date(c.checkinTime).toLocaleString()}
                />
              ))}
              {(postsQuery.data?.items ?? []).slice(0, 3).map((p) => (
                <MyMemoryCard
                  key={p.id}
                  icon="doc.text.fill"
                  title={p.title || t('locationMyPost')}
                  subtitle={new Date(p.createdAt).toLocaleDateString()}
                />
              ))}
            </View>
            {!isMember ? (
              <PressableScale style={[styles.outlineBtn, { borderColor: border }]} onPress={() => router.push('/login')}>
                <ThemedText style={{ color: tint, fontWeight: '700' }}>{t('login')}</ThemedText>
              </PressableScale>
            ) : myReviewQuery.data ? (
              <View style={[styles.myReviewBox, { borderColor: border }]}>
                <ThemedText style={{ fontWeight: '700' }}>{t('locationMyReview')}</ThemedText>
                <ThemedText>★{myReviewQuery.data.rating}</ThemedText>
                {myReviewQuery.data.content ? (
                  <ThemedText numberOfLines={2}>{myReviewQuery.data.content}</ThemedText>
                ) : null}
                <PressableScale onPress={() => {
                  setReviewRating(myReviewQuery.data!.rating);
                  setReviewContent(myReviewQuery.data!.content ?? '');
                  setReviewFormOpen(true);
                }}>
                  <ThemedText style={{ color: tint, fontWeight: '700', fontSize: 13 }}>
                    {t('locationEditReview')}
                  </ThemedText>
                </PressableScale>
              </View>
            ) : (
              <PressableScale
                style={[styles.outlineBtn, { borderColor: border }]}
                onPress={() => setReviewFormOpen(true)}>
                <ThemedText style={{ color: tint, fontWeight: '700' }}>{t('locationWriteReview')}</ThemedText>
              </PressableScale>
            )}

            {reviewFormOpen && isMember ? (
              <View style={[styles.reviewForm, { borderColor: border }]}>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <PressableScale key={s} onPress={() => setReviewRating(s)}>
                      <ThemedText style={{ fontSize: 22, color: s <= reviewRating ? tint : muted }}>★</ThemedText>
                    </PressableScale>
                  ))}
                </View>
                <TextInput
                  value={reviewContent}
                  onChangeText={setReviewContent}
                  placeholder={t('locationReviewPlaceholder')}
                  placeholderTextColor={muted}
                  multiline
                  style={[styles.input, { color: text, borderColor: border }]}
                />
                <PressableScale
                  style={[styles.primaryBtn, { backgroundColor: cta }]}
                  onPress={() => reviewMutation.mutate()}
                  disabled={reviewMutation.isPending}>
                  <ThemedText style={{ color: onCta, fontWeight: '700' }}>
                    {t('locationSubmitReview')}
                  </ThemedText>
                </PressableScale>
              </View>
            ) : null}

            <ThemedText style={styles.sectionTitle}>{t('locationSectionCommunity')}</ThemedText>
            {summaryQuery.data ? (
              <>
                <RatingSummary summary={summaryQuery.data} />
                <ReviewTagCloud tags={summaryQuery.data.tags} />
              </>
            ) : null}
            <ReviewFilters sort={reviewSort} onChange={setReviewSort} />
            <FlatList
              data={reviewItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <LocationReviewCard review={item} />}
              scrollEnabled={false}
              initialNumToRender={5}
              ListEmptyComponent={
                reviewsQuery.isLoading ? (
                  <ActivityIndicator color={tint} style={{ marginVertical: 12 }} />
                ) : (
                  <ThemedText style={{ color: muted, fontSize: 13 }}>{t('locationReviewsEmpty')}</ThemedText>
                )
              }
              ListFooterComponent={
                reviewsQuery.hasNextPage ? (
                  <PressableScale
                    style={[styles.outlineBtn, { borderColor: border }]}
                    onPress={() => void reviewsQuery.fetchNextPage()}
                    disabled={reviewsQuery.isFetchingNextPage}>
                    <ThemedText style={{ color: tint, fontWeight: '600' }}>
                      {reviewsQuery.isFetchingNextPage ? '…' : t('locationLoadMoreReviews')}
                    </ThemedText>
                  </PressableScale>
                ) : null
              }
            />

            {nearbyQuery.data?.length ? (
              <SimilarNearby
                items={nearbyQuery.data}
                onSelect={(item) => {
                  onPinResolved?.({
                    id: item.id,
                    name: item.name,
                    address: item.address,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    avgRating: item.avgRating ?? 0,
                    totalReview: item.totalReview ?? 0,
                    locationType: item.locationType,
                    distanceKm: item.distanceKm,
                  });
                }}
              />
            ) : null}
          </>
        )}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 4,
  },
  handleHit: { alignItems: 'center', paddingVertical: 8 },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8, paddingTop: 4 },
  actionCell: { alignItems: 'center', gap: 6, width: 72 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  memoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  myReviewBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  reviewForm: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  starRow: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  externalBox: { gap: 12, paddingVertical: 8 },
});
