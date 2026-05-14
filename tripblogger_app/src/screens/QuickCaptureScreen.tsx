import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FrameOverlay } from '@/src/components/capture/FrameOverlay';
import { FramePresetStrip } from '@/src/components/capture/FramePresetStrip';
import type { CaptureFramePresetId } from '@/src/components/capture/captureFramePresets';
import { useMeQuery } from '@/src/hooks/useAuth';
import { useI18n } from '@/src/i18n';
import { postsService } from '@/src/services/api/posts.service';
import { usePostComposerHandoffStore } from '@/src/store/post-composer-handoff.store';
import { formatApiError } from '@/src/utils/format-api-error';

export function QuickCaptureScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const meQuery = useMeQuery();
  const isMember = meQuery.data?.role === 'MEMBER';

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [framePreset, setFramePreset] = useState<CaptureFramePresetId>('none');
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const camRef = useRef<InstanceType<typeof CameraView> | null>(null);

  const cta = useThemeColor({}, 'cta');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');

  const pushHandoffAndOpenComposer = useCallback(
    async (uri: string, width?: number, height?: number, mimeType: string = 'image/jpeg') => {
      const uploaded = await postsService.uploadMedia(
        {
          uri,
          name: `capture-${Date.now()}.jpg`,
          type: mimeType,
        },
        'image',
      );
      const item = {
        localId: `${Date.now()}-${Math.random()}`,
        type: 'image' as const,
        url: uploaded.url,
        thumbnailUrl: uploaded.thumbnailUrl,
        previewUrl: uploaded.previewUrl,
        originalUrl: uploaded.originalUrl,
        placeholder: uploaded.placeholder,
        width: uploaded.width ?? width,
        height: uploaded.height ?? height,
      };
      usePostComposerHandoffStore.getState().setPending([item]);
      router.push('/(tabs)/posts/create');
    },
    [router],
  );

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
    setBusy(true);
    try {
      await pushHandoffAndOpenComposer(a.uri, a.width, a.height, a.mimeType ?? 'image/jpeg');
    } catch (e) {
      setError(formatApiError(e, t('captureError')));
    } finally {
      setBusy(false);
    }
  }, [pushHandoffAndOpenComposer, t]);

  const onShutter = useCallback(async () => {
    if (!camRef.current || !cameraReady || busy) return;
    setError(null);
    setBusy(true);
    try {
      const photo = await camRef.current.takePictureAsync({ quality: 0.88 });
      if (process.env.EXPO_OS === 'ios') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await pushHandoffAndOpenComposer(photo.uri, photo.width, photo.height);
    } catch (e) {
      setError(formatApiError(e, t('captureError')));
    } finally {
      setBusy(false);
    }
  }, [busy, cameraReady, pushHandoffAndOpenComposer, t]);

  if (meQuery.isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!isMember) {
    return (
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ThemedView style={styles.guestWrap}>
          <ThemedText type="subtitle">{t('postsMemberRequired')}</ThemedText>
          <Pressable onPress={() => router.push('/(auth)/login')} style={[styles.ctaGhost, { borderColor: border }]}>
            <ThemedText type="link">{t('login')}</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ThemedView style={styles.webWrap}>
          <ThemedText type="subtitle">{t('captureWebHint')}</ThemedText>
          <ThemedText style={[styles.webSub, { color: muted }]}>{t('captureWebSub')}</ThemedText>
          <Pressable
            onPress={() => void onPickFromGallery()}
            disabled={busy}
            style={[styles.ctaSolid, { backgroundColor: cta }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.ctaSolidTxt}>{t('capturePickFromGallery')}</ThemedText>}
          </Pressable>
          {error ? (
            <ThemedText style={styles.err} lightColor="#c00" darkColor="#f66">
              {error}
            </ThemedText>
          ) : null}
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ThemedView style={styles.permWrap}>
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
      <SafeAreaView style={styles.stripSafe} edges={['top']}>
        <FramePresetStrip selectedId={framePreset} onSelect={setFramePreset} />
      </SafeAreaView>

      <View style={styles.cameraShell}>
        <CameraView
          ref={camRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
        />
        <FrameOverlay preset={framePreset} />
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
  cameraShell: { flex: 1, position: 'relative', overflow: 'hidden' },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
  err: { marginTop: 8 },
});
