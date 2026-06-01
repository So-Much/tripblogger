import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import {
  fetchDrivingRoute,
  formatRouteSummary,
  type MapLatLng,
} from '@/src/utils/fetch-driving-route';
import {
  distanceToRouteM,
  haversineM,
  polylineLengthM,
  sliceRouteAhead,
} from '@/src/utils/route-polyline';

export type NavDestination = {
  lat: number;
  lng: number;
  name?: string;
};

const ARRIVE_RADIUS_M = 35;
const REROUTE_OFF_ROUTE_M = 70;
const REROUTE_COOLDOWN_MS = 20_000;

export function useTurnByTurnNavigation() {
  const [active, setActive] = useState(false);
  const [destination, setDestination] = useState<NavDestination | null>(null);
  const [displayPolyline, setDisplayPolyline] = useState<MapLatLng[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [livePosition, setLivePosition] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);

  const fullRouteRef = useRef<MapLatLng[]>([]);
  const destRef = useRef<NavDestination | null>(null);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const lastRerouteAtRef = useRef(0);
  const arrivedRef = useRef(false);

  const stopNavigation = useCallback(() => {
    watchSubRef.current?.remove();
    watchSubRef.current = null;
    arrivedRef.current = false;
    destRef.current = null;
    fullRouteRef.current = [];
    setActive(false);
    setDestination(null);
    setDisplayPolyline([]);
    setSummary(null);
    setLivePosition(null);
    setHeading(null);
  }, []);

  const applyPosition = useCallback(
    async (pos: { lat: number; lng: number }, course?: number | null) => {
      const dest = destRef.current;
      if (!dest) return;

      setLivePosition(pos);
      if (course != null && Number.isFinite(course)) setHeading(course);

      const distToDest = haversineM(pos, dest);
      if (distToDest <= ARRIVE_RADIUS_M) {
        if (!arrivedRef.current) {
          arrivedRef.current = true;
          Alert.alert('Đã đến nơi', dest.name ?? 'Bạn đã tới điểm đích.');
          stopNavigation();
        }
        return;
      }

      const ahead = sliceRouteAhead(pos, fullRouteRef.current, dest);
      setDisplayPolyline(ahead);
      const remainM = polylineLengthM(ahead);
      setSummary(formatRouteSummary(remainM, (remainM / 1000 / 28) * 3600));

      const offRoute = distanceToRouteM(pos, fullRouteRef.current) > REROUTE_OFF_ROUTE_M;
      const now = Date.now();
      if (offRoute && now - lastRerouteAtRef.current > REROUTE_COOLDOWN_MS) {
        lastRerouteAtRef.current = now;
        try {
          const route = await fetchDrivingRoute(pos, dest);
          fullRouteRef.current = route.coordinates;
          const next = sliceRouteAhead(pos, route.coordinates, dest);
          setDisplayPolyline(next);
          setSummary(formatRouteSummary(polylineLengthM(next), route.durationS));
        } catch {
          // keep previous polyline
        }
      }
    },
    [stopNavigation],
  );

  const startNavigation = useCallback(
    async (dest: NavDestination) => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert('Cần quyền vị trí', 'Bật GPS để chỉ đường từ vị trí hiện tại của bạn.');
        return;
      }

      setLoading(true);
      arrivedRef.current = false;
      destRef.current = dest;
      setDestination(dest);
      lastRerouteAtRef.current = 0;

      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLivePosition(origin);
        if (pos.coords.heading != null && pos.coords.heading >= 0) {
          setHeading(pos.coords.heading);
        }

        const route = await fetchDrivingRoute(origin, dest);
        fullRouteRef.current = route.coordinates;
        const ahead = sliceRouteAhead(origin, route.coordinates, dest);
        setDisplayPolyline(ahead);
        setSummary(formatRouteSummary(route.distanceM, route.durationS));
        setActive(true);

        watchSubRef.current?.remove();
        watchSubRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,
            distanceInterval: 4,
          },
          (update) => {
            void applyPosition(
              { lat: update.coords.latitude, lng: update.coords.longitude },
              update.coords.heading,
            );
          },
        );
      } catch (e) {
        stopNavigation();
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [applyPosition, stopNavigation],
  );

  useEffect(() => {
    return () => {
      watchSubRef.current?.remove();
    };
  }, []);

  return {
    active,
    destination,
    displayPolyline,
    summary,
    loading,
    livePosition,
    heading,
    startNavigation,
    stopNavigation,
  };
}
