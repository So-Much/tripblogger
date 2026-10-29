import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { usePostComposerHandoffStore } from '@/src/store/post-composer-handoff.store';
import { formatApiError } from '@/src/utils/format-api-error';

type Facing = 'user' | 'environment';
type Phase = 'starting' | 'live' | 'denied' | 'unsupported';

function cameraConstraints(facing: Facing): MediaStreamConstraints {
  return {
    audio: false,
    video: { facingMode: { ideal: facing } },
  };
}

/** Browser capture via the device camera. VisionCamera has no web build. */
export function CompositionCameraScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const meQuery = useMeQuery();
  const isMember = meQuery.data?.role === 'MEMBER';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('starting');
  const [facing, setFacing] = useState<Facing>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cta = useThemeColor({}, 'cta');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const surface = useThemeColor({}, 'surface');

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const attach = useCallback((stream: MediaStream) => {
    const node = videoRef.current;
    if (!node) return;
    node.srcObject = stream;
    void node.play().catch(() => undefined);
  }, []);

  const openCamera = useCallback(
    async (nextFacing: Facing) => {
      const devices = navigator.mediaDevices;
      if (!devices?.getUserMedia) {
        setPhase('unsupported');
        setError(t('captureWebCameraDenied'));
        return;
      }
      setPhase('starting');
      setError(null);
      stopStream();
      try {
        const stream = await devices.getUserMedia(cameraConstraints(nextFacing));
        streamRef.current = stream;
        attach(stream);
        setPhase('live');
      } catch {
        setPhase('denied');
        setError(t('captureWebCameraDenied'));
      }
    },
    [attach, stopStream, t],
  );

  useEffect(() => {
    void openCamera(facing);
    return () => stopStream();
  }, [facing, openCamera, stopStream]);

  const exitCapture = useCallback(() => {
    stopStream();
    router.replace('/(tabs)');
  }, [router, stopStream]);

  const handoff = useCallback(
    (uri: string, width?: number, height?: number, mimeType?: string, fileName?: string) => {
      if (!isMember) {
        Alert.alert(t('captureSavedToLibrary'), t('captureGuestLoginHint'));
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
          mimeType: mimeType ?? 'image/jpeg',
          fileName,
        },
      ]);
      stopStream();
      router.push('/(tabs)/posts/create');
    },
    [isMember, router, stopStream, t],
  );

  const onShutter = useCallback(async () => {
    const video = videoRef.current;
    if (!video || phase !== 'live' || busy || !video.videoWidth) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('empty');
      handoff(URL.createObjectURL(blob), canvas.width, canvas.height, 'image/jpeg', `capture-${Date.now()}.jpg`);
    } catch (e) {
      setError(formatApiError(e, t('captureError')));
    } finally {
      setBusy(false);
    }
  }, [busy, handoff, phase, t]);

  const onPickFromGallery = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.9,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      handoff(asset.uri, asset.width, asset.height, asset.mimeType ?? 'image/jpeg', asset.fileName ?? undefined);
    } catch (e) {
      setError(formatApiError(e, t('captureError')));
    } finally {
      setBusy(false);
    }
  }, [handoff, t]);

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <ThemedView style={styles.stage}>
        {createElement('video', {
          ref: (node: HTMLVideoElement | null) => {
            videoRef.current = node;
            if (node && streamRef.current) attach(streamRef.current);
          },
          autoPlay: true,
          playsInline: true,
          muted: true,
          style: {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            background: '#000',
            transform: facing === 'user' ? 'scaleX(-1)' : undefined,
          },
        })}
        <View style={styles.topRow}>
          <Pressable onPress={exitCapture} style={styles.iconBtn} accessibilityLabel={t('backHome')}>
            <IconSymbol name="xmark.circle.fill" size={28} color="#fff" />
          </Pressable>
          {phase === 'live' ? (
            <Pressable
              onPress={() => setFacing((current) => (current === 'environment' ? 'user' : 'environment'))}
              style={styles.iconBtn}
              accessibilityLabel={t('captureFlipCamera')}>
              <IconSymbol name="camera.rotate" size={26} color="#fff" />
            </Pressable>
          ) : null}
        </View>
        {phase !== 'live' ? (
          <View style={[styles.prompt, { backgroundColor: surface }]}>
            <ThemedText type="subtitle">{t('captureWebHint')}</ThemedText>
            <ThemedText style={[styles.webSub, { color: muted }]}>{error ?? t('captureWebSub')}</ThemedText>
            <Pressable onPress={() => void openCamera(facing)} style={[styles.ctaSolid, { backgroundColor: cta }]}>
              {phase === 'starting' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.ctaSolidTxt}>{t('captureGrantPermission')}</ThemedText>
              )}
            </Pressable>
          </View>
        ) : null}
        <View style={styles.bottomRow}>
          <Pressable onPress={() => void onPickFromGallery()} disabled={busy} style={styles.sideBtn} accessibilityLabel={t('capturePickFromGallery')}>
            <IconSymbol name="photo.on.rectangle" size={26} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => void onShutter()}
            disabled={busy || phase !== 'live'}
            style={[styles.shutter, phase === 'live' ? null : styles.shutterOff]}
            accessibilityLabel={t('captureShutter')}>
            {busy ? <ActivityIndicator color="#fff" /> : <View style={styles.shutterInner} />}
          </Pressable>
          <View style={styles.sideBtn} />
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  stage: { flex: 1, backgroundColor: '#000' },
  topRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '30%',
    zIndex: 2,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  webSub: { fontSize: 14, lineHeight: 20 },
  ctaSolid: {
    alignSelf: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 180,
    alignItems: 'center',
  },
  ctaSolidTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  bottomRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: { opacity: 0.4 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
});
