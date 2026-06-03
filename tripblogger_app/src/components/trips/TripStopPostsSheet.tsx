import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';
import { postsService } from '@/src/services/api/posts.service';
import { tripsService } from '@/src/services/api/trips.service';
import type { MapRouteStop } from '@/src/types/trip-map';

type TripStopPostsSheetProps = {
  visible: boolean;
  tripId: string | null;
  stop: MapRouteStop | null;
  onClose: () => void;
  onCheckinSuccess?: () => void;
};

export function TripStopPostsSheet({
  visible,
  tripId,
  stop,
  onClose,
  onCheckinSuccess,
}: TripStopPostsSheetProps) {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const postsQuery = useQuery({
    queryKey: ['posts', 'mine', 'near', stop?.id, stop?.locationId, stop?.latitude, stop?.longitude],
    queryFn: () =>
      postsService.listMineNear({
        locationId: stop?.locationId,
        lat: stop?.latitude,
        lng: stop?.longitude,
        radiusM: 300,
        limit: 15,
      }),
    enabled: visible && Boolean(stop),
  });

  const canCheckin =
    stop && (stop.status === 'PLANNED' || stop.status === 'VISITING') && Boolean(tripId);

  const handleCheckin = async () => {
    if (!tripId || !stop) return;
    try {
      await tripsService.checkinStop(tripId, stop.id);
      onCheckinSuccess?.();
      void qc.invalidateQueries({ queryKey: ['trips', 'route', tripId] });
      onClose();
    } catch {
      // parent may toast
    }
  };

  if (!stop) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: card, borderColor: border, paddingBottom: Math.max(insets.bottom, 12) },
        ]}>
        <ThemedText type="subtitle" numberOfLines={1}>
          {stop.name}
        </ThemedText>
        <ThemedText style={{ color: muted, fontSize: 12 }}>{t('tripStopPostsTitle')}</ThemedText>

        {postsQuery.isLoading ? (
          <ActivityIndicator style={{ marginVertical: 16 }} />
        ) : postsQuery.data?.items.length ? (
          <ScrollView style={{ maxHeight: 220 }}>
            {postsQuery.data.items.map((post) => (
              <PressableScale
                key={post.id}
                style={[styles.postRow, { borderColor: border }]}
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/(tabs)/posts/[id]', params: { id: post.id } });
                }}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {post.title}
                </ThemedText>
              </PressableScale>
            ))}
          </ScrollView>
        ) : (
          <ThemedText style={{ color: muted, fontSize: 13 }}>{t('tripStopPostsEmpty')}</ThemedText>
        )}

        {canCheckin ? (
          <PressableScale style={[styles.checkinBtn, { backgroundColor: cta }]} onPress={() => void handleCheckin()}>
            <ThemedText style={{ color: onCta, fontWeight: '700' }}>{t('tripCheckinHere')}</ThemedText>
          </PressableScale>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  postRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  checkinBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
});
