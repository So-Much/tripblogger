import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import type { NavDestination } from '@/src/hooks/useTurnByTurnNavigation';
import type { useTurnByTurnNavigation } from '@/src/hooks/useTurnByTurnNavigation';
import { openDirectionsTo, openGoogleMapsTo } from '@/src/utils/open-directions';

type NavigationApi = Pick<
  ReturnType<typeof useTurnByTurnNavigation>,
  'startNavigation' | 'loading' | 'livePosition'
>;

export function useDirectionsLauncher(navigation: NavigationApi) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingDest, setPendingDest] = useState<NavDestination | null>(null);
  const launchingRef = useRef(false);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const openPicker = useCallback((dest: NavDestination) => {
    setPendingDest(dest);
    setPickerVisible(true);
  }, []);

  const launchInApp = useCallback(async () => {
    if (!pendingDest || launchingRef.current || navigation.loading) return;
    launchingRef.current = true;
    setPickerVisible(false);
    try {
      await navigation.startNavigation(pendingDest);
    } catch {
      Alert.alert('Không bắt đầu chỉ đường', 'Thử lại sau.');
    } finally {
      launchingRef.current = false;
    }
  }, [navigation.loading, navigation.startNavigation, pendingDest]);

  const launchExternal = useCallback(async () => {
    if (!pendingDest) return;
    setPickerVisible(false);
    const origin = navigation.livePosition;
    try {
      await openDirectionsTo(
        { lat: pendingDest.lat, lng: pendingDest.lng },
        origin ?? undefined,
      );
    } catch {
      Alert.alert('Không mở được bản đồ', 'Thử lại sau.');
    }
  }, [navigation.livePosition, pendingDest]);

  const launchGoogle = useCallback(async () => {
    if (!pendingDest) return;
    setPickerVisible(false);
    const origin = navigation.livePosition;
    try {
      await openGoogleMapsTo(
        { lat: pendingDest.lat, lng: pendingDest.lng },
        origin ?? undefined,
      );
    } catch {
      Alert.alert('Không mở được Google Maps', 'Thử lại sau.');
    }
  }, [navigation.livePosition, pendingDest]);

  const launchApple = useCallback(async () => {
    if (!pendingDest) return;
    setPickerVisible(false);
    const destStr = `${pendingDest.lat},${pendingDest.lng}`;
    const origin = navigation.livePosition;
    const url = origin
      ? `maps://?saddr=${origin.lat},${origin.lng}&daddr=${destStr}&dirflg=d`
      : `maps://?daddr=${destStr}&dirflg=d`;
    try {
      const { Linking } = await import('react-native');
      await Linking.openURL(url);
    } catch {
      await launchExternal();
    }
  }, [launchExternal, navigation.livePosition, pendingDest]);

  const showAppleMaps = Platform.OS === 'ios';

  return {
    pickerVisible,
    pendingDest,
    openPicker,
    closePicker,
    launchInApp,
    launchGoogle,
    launchApple,
    showAppleMaps,
    isRouting: navigation.loading,
  };
}
