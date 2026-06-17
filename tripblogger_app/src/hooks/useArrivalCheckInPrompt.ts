import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { translate } from '@/src/i18n';
import { useSettingsStore } from '@/src/store/settings.store';
import { tripsService } from '@/src/services/api/trips.service';
import type { MapRouteStop } from '@/src/types/trip-map';

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const ARRIVAL_RADIUS_M = 80;
const PROMPT_COOLDOWN_MS = 10 * 60 * 1000;

export function useArrivalCheckInPrompt(options: {
  enabled: boolean;
  tripId?: string;
  nextStop: MapRouteStop | null;
  routeStops: MapRouteStop[];
  userCoords: { lat: number; lng: number } | null;
  onSuccess: () => void;
}) {
  const { enabled, tripId, nextStop, routeStops, userCoords, onSuccess } = options;
  const language = useSettingsStore((s) => s.language);
  const dismissedUntilRef = useRef<Record<string, number>>({});
  const promptingRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!enabled || !tripId || !nextStop || !userCoords || promptingRef.current) return;

    const distanceM = haversineM(userCoords, {
      lat: nextStop.latitude,
      lng: nextStop.longitude,
    });
    if (distanceM > ARRIVAL_RADIUS_M) return;

    const cooldown = dismissedUntilRef.current[nextStop.id] ?? 0;
    if (Date.now() < cooldown) return;

    promptingRef.current = true;
    Alert.alert(
      translate(language, 'tripArrivalConfirmTitle'),
      translate(language, 'tripArrivalConfirmBody', { name: nextStop.name }),
      [
        {
          text: translate(language, 'tripArrivalNotYet'),
          style: 'cancel',
          onPress: () => {
            dismissedUntilRef.current[nextStop.id] = Date.now() + PROMPT_COOLDOWN_MS;
            promptingRef.current = false;
          },
        },
        {
          text: translate(language, 'tripArrivalYes'),
          onPress: () => {
            void (async () => {
              try {
                const visiting = routeStops.find((s) => s.status === 'VISITING');
                if (visiting && visiting.id !== nextStop.id) {
                  await tripsService.completeStop(tripId, visiting.id);
                }
                await tripsService.checkinStop(tripId, nextStop.id);
                onSuccessRef.current();
              } catch {
                Alert.alert(
                  translate(language, 'tripArrivalUpdateFailed'),
                  translate(language, 'tripArrivalUpdateFailedHint'),
                );
              } finally {
                promptingRef.current = false;
              }
            })();
          },
        },
      ],
    );
  }, [enabled, tripId, nextStop, routeStops, userCoords, language]);
}
