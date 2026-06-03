import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

/** Foreground GPS updates every ~30s for arrival check-in prompts. */
export function useArrivalWatch(enabled: boolean) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCoords(null);
      return;
    }

    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    void (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED || cancelled) return;

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (!cancelled) {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30_000,
          distanceInterval: 25,
        },
        (p) => {
          setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return coords;
}
