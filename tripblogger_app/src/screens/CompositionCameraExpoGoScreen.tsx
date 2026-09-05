import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { CaptureCameraControls } from '@/src/components/capture/CaptureCameraControls';
import { CompositionGuideOverlay } from '@/src/components/capture/CompositionGuideOverlay';
import { CompositionOverlay } from '@/src/components/capture/CompositionOverlay';
import { CompositionStrip } from '@/src/components/capture/CompositionStrip';
import { CompositionToggleButton } from '@/src/components/capture/CompositionToggleButton';
import { HorizonLevel } from '@/src/components/capture/HorizonLevel';
import { useCompositionDetail, useCompositionsList } from '@/src/hooks/useCompositions';
import { useAndroidBack } from '@/src/hooks/useAndroidBack';
import { useGyroscopeStability } from '@/src/hooks/useGyroscopeStability';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { usePostComposerHandoffStore } from '@/src/store/post-composer-handoff.store';
import type { CompositionListItem } from '@/src/types/composition';
import { formatApiError } from '@/src/utils/format-api-error';
import { saveCaptureToPhotoLibrary } from '@/src/utils/save-capture-photo';

/**
 * Composition camera for Expo Go — expo-camera + API overlays.
 * Face detector / vision-camera require a development build.
 */
export function CompositionCameraExpoGoScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const meQuery = useMeQuery();
  const isMember = meQuery.data?.role === 'MEMBER';

  const compositionsQuery = useCompositionsList();
  const items = useMemo(() => compositionsQuery.data?.items ?? [], [compositionsQuery.data?.items]);

  const [selected, setSelected] = useState<CompositionListItem | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [torch, setTorch] = useState(false);
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 });
  const [guideStep, setGuideStep] = useState(0);

  const camRef = useRef<InstanceType<typeof CameraView> | null>(null);
  const hapticLock = useRef(false);

  const [permission, requestPermission] = useCameraPermissions();

  const detailQuery = useCompositionDetail(selected?.slug ?? null);
  const composition = detailQuery.data;

  const { steady, level, rollDeg } = useGyroscopeStability(overlayVisible);

  useEffect(() => {
    if (!items.length || selected) return;
    setSelected(items[0]);
  }, [items, selected]);

  useEffect(() => {
    if (!composition?.guides?.length) {
      setGuideStep(0);
      return;
    }
    const sorted = [...composition.guides].sort((a, b) => a.stepOrder - b.stepOrder);
    let idx = 0;
    for (let i = 0; i < sorted.length; i++) {
      const g = sorted[i];
      const ok =
        (g.triggerCondition === 'phone_steady' && steady) ||
        (g.triggerCondition === 'level_horizon' && level) ||
        g.triggerCondition === 'manual';
      if (!ok) {
        idx = i;
        break;
      }
      idx = Math.min(i + 1, sorted.length - 1);
    }
    setGuideStep(idx);
  }, [composition?.guides, steady, level]);

  useEffect(() => {
    if (!steady || !level || !overlayVisible) return;
    if (hapticLock.current) return;
    hapticLock.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const tmr = setTimeout(() => {
      hapticLock.current = false;
    }, 1200);
    return () => clearTimeout(tmr);
  }, [steady, level, overlayVisible]);

  const cta = useThemeColor({}, 'cta');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');

  const exitCapture = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  useAndroidBack(() => {
    exitCapture();
    return true;
  });

  const selectByDelta = useCallback(
    (delta: number) => {
      if (!items.length || !selected) return;
      const idx = items.findIndex((c) => c.id === selected.id);
      const next = (idx + delta + items.length) % items.length;
      setSelected(items[next]);
      void Haptics.selectionAsync();
    },
    [items, selected],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .onEnd((e) => {
          if (e.translationX > 40) runOnJS(selectByDelta)(-1);
          else if (e.translationX < -40) runOnJS(selectByDelta)(1);
        }),
    [selectByDelta],
  );

  const handleCaptureResult = useCallback(
    async (uri: string, width?: number, height?: number, mimeType: string = 'image/jpeg', fileName?: string) => {
      if (!isMember) {
        setError(null);
        setBusy(true);
        try {
          await saveCaptureToPhotoLibrary(uri);
          if (process.env.EXPO_OS === 'ios') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          Alert.alert(t('captureSavedToLibrary'), t('captureGuestLoginHint'));
        } catch (e) {
          const denied = e instanceof Error && e.message === 'PHOTO_LIBRARY_PERMISSION_DENIED';
          setError(denied ? t('photoPermissionMessage') : formatApiError(e, t('captureSaveFailed')));
        } finally {
          setBusy(false);
        }
        return;
      }

      usePostComposerHandoffStore.getState().setPending([
        {
          localId: `${Date.now()}-${Math.random()}`,
          type: 'image',
          url: uri,
          width,
          height,
          pendingUpload: true,
          mimeType,
          fileName,
          compositionId: selected?.id,
        },
      ]);
      router.push('/(tabs)/posts/create');
    },
    [isMember, router, selected?.id, t],
  );

  const cycleFlash = useCallback(() => {
    setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'));
    setTorch(false);
  }, []);

  const toggleTorch = useCallback(() => {
    setTorch((prev) => {
      const next = !prev;
      if (next) setFlash('off');
      return next;
    });
  }, []);

  const onPickFromGallery = useCallback(async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(t('photoPermissionMessage'));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const a = picked.assets[0];
    void handleCaptureResult(a.uri, a.width, a.height, a.mimeType ?? 'image/jpeg', a.fileName ?? undefined);
  }, [handleCaptureResult, t]);

  const onShutter = useCallback(async () => {
    if (!camRef.current || !cameraReady || busy) return;
    setError(null);
    setBusy(true);
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.88 });
      if (process.env.EXPO_OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      void handleCaptureResult(photo.uri, photo.width, photo.height, 'image/jpeg', `capture-${Date.now()}.jpg`);
    } catch (e) {
      setError(formatApiError(e, t('captureError')));
    } finally {
      setBusy(false);
    }
  }, [busy, cameraReady, handleCaptureResult, t]);

  if (meQuery.isLoading || compositionsQuery.isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ThemedView style={styles.webWrap}>
          <Pressable onPress={exitCapture} style={styles.closeBtn} accessibilityLabel={t('backHome')}>
            <IconSymbol name="xmark.circle.fill" size={24} color={text} />
          </Pressable>
          <ThemedText type="subtitle">{t('captureWebHint')}</ThemedText>
          <ThemedText style={[styles.webSub, { color: muted }]}>{t('captureWebSub')}</ThemedText>
          <Pressable
            onPress={() => void onPickFromGallery()}
            disabled={busy}
            style={[styles.ctaSolid, { backgroundColor: cta }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.ctaSolidTxt}>{t('capturePickFromGallery')}</ThemedText>}
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ThemedView style={styles.permWrap}>
          <Pressable onPress={exitCapture} style={styles.closeBtn} accessibilityLabel={t('backHome')}>
            <IconSymbol name="xmark.circle.fill" size={24} color={text} />
          </Pressable>
          <ThemedText type="subtitle">{t('cameraPermissionTitle')}</ThemedText>
          <ThemedText style={[styles.permMsg, { color: muted }]}>{t('cameraPermissionMessage')}</ThemedText>
          <Pressable onPress={() => void requestPermission()} style={[styles.ctaSolid, { backgroundColor: cta }]}>
            <ThemedText style={styles.ctaSolidTxt}>{t('captureGrantPermission')}</ThemedText>
          </Pressable>
          {permission && !permission.granted && !permission.canAskAgain ? (
            <Pressable onPress={() => void Linking.openSettings()} style={[styles.ctaGhost, { borderColor: border }]}>
              <ThemedText style={{ color: text }}>{t('captureOpenSettings')}</ThemedText>
            </Pressable>
          ) : null}
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={[styles.stripSafe, styles.presetBar]} edges={['top']}>
        <ThemedText style={styles.expoGoBanner}>{t('compositionExpoGoHint')}</ThemedText>
        <View style={styles.topRow}>
          <Pressable onPress={exitCapture} style={styles.closeBtn} accessibilityLabel={t('backHome')}>
            <IconSymbol name="xmark.circle.fill" size={24} color="#fff" />
          </Pressable>
          <CompositionToggleButton visible={overlayVisible} onToggle={() => setOverlayVisible((v) => !v)} />
          {items.length ? (
            <CompositionStrip
              items={items}
              selectedId={selected?.id ?? null}
              onSelect={(item) => {
                setSelected(item);
                void Haptics.selectionAsync();
              }}
            />
          ) : null}
        </View>
      </SafeAreaView>

      <View
        style={styles.cameraShell}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setPreviewSize({ width, height });
        }}>
        <CameraView
          ref={camRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="picture"
          zoom={zoom}
          flash={flash}
          enableTorch={torch}
          onCameraReady={() => setCameraReady(true)}
        />
        <GestureDetector gesture={panGesture}>
          <View style={styles.pinchLayer} collapsable={false}>
            {composition?.overlays?.length ? (
              <CompositionOverlay
                overlays={composition.overlays}
                previewWidth={previewSize.width}
                previewHeight={previewSize.height}
                visible={overlayVisible}
                steady={steady}
                level={level}
                faceAligned={false}
              />
            ) : null}
            <HorizonLevel rollDeg={rollDeg} level={level} />
            {composition?.guides?.length ? (
              <CompositionGuideOverlay
                guides={composition.guides}
                activeStepIndex={guideStep}
                steady={steady}
                level={level}
                faceAligned={false}
              />
            ) : null}
          </View>
        </GestureDetector>
        <View style={styles.controlsDock} pointerEvents="box-none">
          <CaptureCameraControls
            zoom={zoom}
            onZoomChange={setZoom}
            flash={flash}
            onFlashCycle={cycleFlash}
            torch={torch}
            onTorchToggle={toggleTorch}
            disabled={busy}
          />
        </View>
        {busy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={styles.busyTxt}>{t('captureProcessing')}</ThemedText>
          </View>
        ) : null}
      </View>

      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        {error ? (
          <ThemedText style={styles.errBanner} lightColor="#fecaca" darkColor="#fca5a5">
            {error}
          </ThemedText>
        ) : null}
        <View style={styles.bottomRow}>
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={[styles.sideBtn, { borderColor: border, backgroundColor: card }]}
            accessibilityLabel={t('captureFlipCamera')}>
            <IconSymbol name="camera.rotate" size={22} color={text} />
          </Pressable>
          <Pressable
            onPress={() => void onShutter()}
            disabled={!cameraReady || busy}
            style={[styles.shutter, { borderColor: border }]}
            accessibilityLabel={t('captureShutter')}>
            <View style={[styles.shutterInner, { backgroundColor: cta }]} />
          </Pressable>
          <Pressable
            onPress={() => void onPickFromGallery()}
            disabled={busy}
            style={[styles.sideBtn, { borderColor: border, backgroundColor: card }]}
            accessibilityLabel={t('capturePickFromGallery')}>
            <IconSymbol name="photo.on.rectangle" size={22} color={text} />
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guestWrap: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  webWrap: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  webSub: { fontSize: 14, lineHeight: 20 },
  permWrap: { flex: 1, padding: 24, gap: 14, justifyContent: 'center' },
  permMsg: { fontSize: 14, lineHeight: 20 },
  stripSafe: { backgroundColor: 'transparent' },
  expoGoBanner: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraShell: { flex: 1, position: 'relative', overflow: 'hidden' },
  pinchLayer: { ...StyleSheet.absoluteFill },
  controlsDock: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    zIndex: 2,
  },
  presetBar: { backgroundColor: 'rgba(0,0,0,0.58)' },
  busyOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 3,
  },
  busyTxt: { color: '#fff', fontWeight: '600' },
  bottomBar: { paddingTop: 8, paddingHorizontal: 16, gap: 8 },
  errBanner: { textAlign: 'center', fontSize: 13 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  sideBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30 },
  ctaGhost: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ctaSolid: {
    alignSelf: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  ctaSolidTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
