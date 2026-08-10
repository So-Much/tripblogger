import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n, type TranslationKey } from '@/src/i18n';
import { formatApiError } from '@/src/utils/format-api-error';
import { tripKeys } from '../hooks/trip-query-keys';
import { usePatchStopMutation } from '../hooks/useTripMutations';
import type { PatchStopDto, ScheduleConflict, TripDetailDto, TripStopDto } from '../types/plan';
import {
  applyLocalStopPatch,
  clockFromIso,
  patchAffectsLocalSchedule,
} from './applyLocalDaySchedule';

type Props = {
  visible: boolean;
  tripId: string;
  stop: TripStopDto | null;
  conflict: ScheduleConflict | null;
  onClose: () => void;
};

type ResolveAction = {
  key: string;
  labelKey: TranslationKey;
  patch: PatchStopDto;
};

function actionsForConflict(
  conflict: ScheduleConflict,
  stop: TripStopDto,
): ResolveAction[] {
  const actions: ResolveAction[] = [];

  if (conflict.type === 'anchor_unreachable') {
    const arriveClock = clockFromIso(stop.schedule?.arriveAt);
    if (arriveClock) {
      actions.push({
        key: 'push',
        labelKey: 'planResolvePushAnchor',
        patch: { anchorTime: arriveClock },
      });
    }
    actions.push({
      key: 'clear',
      labelKey: 'planResolveClearAnchor',
      patch: { anchorTime: null },
    });
  }

  if (conflict.type === 'closed_on_arrival' || conflict.type === 'anchor_unreachable') {
    actions.push({
      key: 'skip',
      labelKey: 'planResolveSkip',
      patch: { status: 'skipped' },
    });
  }

  if (conflict.type === 'travel_unknown') {
    actions.push({
      key: 'skip',
      labelKey: 'planResolveSkip',
      patch: { status: 'skipped' },
    });
  }

  return actions;
}

const CONFLICT_TITLE: Record<ScheduleConflict['type'], TranslationKey> = {
  anchor_unreachable: 'planConflictAnchor',
  closed_on_arrival: 'planConflictClosed',
  travel_unknown: 'planConflictTravelUnknown',
};

/**
 * Resolve sheet opened from a conflict chip — push/clear anchor or skip.
 */
export function PlanConflictActions({ visible, tripId, stop, conflict, onClose }: Props) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const patchStop = usePatchStopMutation();

  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');

  const [error, setError] = useState<string | null>(null);

  if (!stop || !conflict) return null;

  const actions = actionsForConflict(conflict, stop);

  const run = (patch: PatchStopDto) => {
    setError(null);
    if (patchAffectsLocalSchedule(patch)) {
      queryClient.setQueryData<TripDetailDto>(tripKeys.detail(tripId), (old) =>
        old ? applyLocalStopPatch(old, stop.id, patch) : old,
      );
    }
    patchStop.mutate(
      { tripId, stopId: stop.id, dto: patch },
      {
        onSuccess: () => onClose(),
        onError: (err) => {
          void queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
          setError(formatApiError(err, t('errorTitle')));
        },
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: surface,
            borderColor: border,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: muted }]} />
        <Text style={[styles.title, { color: text }]}>{stop.name}</Text>
        <Text style={[styles.subtitle, { color: muted }]}>
          {t(CONFLICT_TITLE[conflict.type])}
          {conflict.type === 'anchor_unreachable' && conflict.lateMinutes != null
            ? ` · +${conflict.lateMinutes}′`
            : ''}
        </Text>

        <View style={styles.actions}>
          {actions.map((a) => {
            const isSkip = a.key === 'skip';
            return (
              <Pressable
                key={a.key}
                disabled={patchStop.isPending}
                onPress={() => run(a.patch)}
                style={[
                  styles.actionBtn,
                  {
                    borderColor: isSkip ? danger : tint,
                    backgroundColor: isSkip ? `${danger}12` : `${tint}14`,
                  },
                ]}>
                {patchStop.isPending ? (
                  <ActivityIndicator color={isSkip ? danger : tint} />
                ) : (
                  <Text
                    style={{
                      color: isSkip ? danger : tint,
                      fontWeight: '700',
                      fontSize: 15,
                    }}>
                    {t(a.labelKey)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={{ color: danger, fontSize: 13 }}>{error}</Text> : null}

        <Pressable onPress={onClose} style={styles.cancel}>
          <Text style={{ color: muted, fontWeight: '600' }}>{t('cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 13, marginBottom: 8 },
  actions: { gap: 10 },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
