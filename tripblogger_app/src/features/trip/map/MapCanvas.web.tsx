import { createElement, forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { MapCanvasHandle } from './map-canvas-types';
import { DEFAULT_MAP_CENTER } from './map-style';

type Props = {
  userLat?: number;
  userLng?: number;
  onMapIdleCenter?: (lat: number, lng: number) => void;
  onLongPress?: (lat: number, lng: number) => void;
  onPoiPress?: (placeId: string) => void;
};

function embedUrl(lat: number, lng: number): string {
  const delta = 0.045;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;
}

/** Browser map. react-native-maps needs a native view and a Google key, so web uses OpenStreetMap. */
export const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  { userLat, userLng, onMapIdleCenter },
  ref,
) {
  const [center, setCenter] = useState({
    lat: userLat ?? DEFAULT_MAP_CENTER.latitude,
    lng: userLng ?? DEFAULT_MAP_CENTER.longitude,
  });

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (lng, lat) => setCenter({ lat, lng }),
      fitRoute: (coordinates) => {
        const first = coordinates[0];
        if (!first) return;
        setCenter({ lng: first[0], lat: first[1] });
      },
      resetNorth: () => undefined,
    }),
    [],
  );

  useEffect(() => {
    if (userLat == null || userLng == null) return;
    setCenter({ lat: userLat, lng: userLng });
  }, [userLat, userLng]);

  useEffect(() => {
    onMapIdleCenter?.(center.lat, center.lng);
  }, [center.lat, center.lng, onMapIdleCenter]);

  return (
    <View style={styles.root}>
      {createElement('iframe', {
        src: embedUrl(center.lat, center.lng),
        title: 'Map',
        style: { border: 0, width: '100%', height: '100%' },
      })}
    </View>
  );
});

export type { MapCanvasHandle } from './map-canvas-types';

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 320 },
});
