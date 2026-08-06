import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type UserCoords = {
  lat: number;
  lng: number;
  heading: number | null;
  accuracy: number | null;
};

export function useUserLocation(enabled = true) {
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        setPermission(status);
        if (status !== Location.PermissionStatus.GRANTED) {
          setError('permission_denied');
          return;
        }
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setCoords({
          lat: current.coords.latitude,
          lng: current.coords.longitude,
          heading: current.coords.heading,
          accuracy: current.coords.accuracy,
        });
        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,
            distanceInterval: 4,
          },
          (pos) => {
            setCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading,
              accuracy: pos.coords.accuracy,
            });
          },
        );
      } catch {
        if (!cancelled) setError('location_failed');
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { permission, coords, error, granted: permission === Location.PermissionStatus.GRANTED };
}
