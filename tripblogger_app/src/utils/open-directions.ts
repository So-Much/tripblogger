import { Linking, Platform } from 'react-native';

type Coords = { lat: number; lng: number };

export async function openDirectionsTo(dest: Coords, origin?: Coords | null) {
  const destStr = `${dest.lat},${dest.lng}`;
  const webFallback = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destStr}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${destStr}&travelmode=driving`;

  const nativeUrl = origin
    ? Platform.select({
        ios: `maps://?saddr=${origin.lat},${origin.lng}&daddr=${destStr}&dirflg=d`,
        android: `google.navigation:q=${destStr}`,
        default: webFallback,
      })
    : Platform.select({
        ios: `maps://?daddr=${destStr}&dirflg=d`,
        android: `google.navigation:q=${destStr}`,
        default: webFallback,
      });

  if (nativeUrl) {
    try {
      const can = await Linking.canOpenURL(nativeUrl);
      if (can) {
        await Linking.openURL(nativeUrl);
        return;
      }
    } catch {
      // fall through to web URL
    }
  }

  await Linking.openURL(webFallback);
}
