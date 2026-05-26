import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { postsService } from '@/src/services/api/posts.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { uploadAllPendingMedia } from '@/src/utils/upload-editor-media';
import { getContainedMediaFrame } from '@/src/utils/media-viewer-layout';
import { HashtagChipInput } from '@/src/components/posts/HashtagChipInput';
import { PostCategoryPicker } from '@/src/components/posts/PostCategoryPicker';
import { PostLocationPicker } from '@/src/components/posts/PostLocationPicker';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { ShakeView, type ShakeViewHandle } from '@/src/components/feedback/ShakeView';
import { useMeQuery } from '@/src/hooks/useAuth';
import { usePostComposerHandoffStore } from '@/src/store/post-composer-handoff.store';
import {
  dedupeTags,
  mergeHashtagsIntoContentHtml,
  parseTagsFromContentHtml,
  stripTrailingHashtagBlock,
} from '@/src/utils/post-hashtag-content';
import type { PostEditorMedia } from '@/src/types/post-editor-media';
import type { ComposerLocation } from '@/src/types/place';
import * as ImagePicker from 'expo-image-picker';

type EditorMedia = PostEditorMedia;
type SaveTier = 'create' | 'meta' | 'core' | 'media';
const EMPTY_DRAFT_HTML = '<p></p>';

function DraggableMediaThumb({
  item,
  isActive,
  drag,
  onPreview,
  onRemove,
}: {
  item: EditorMedia;
  isActive: boolean;
  drag: () => void;
  onPreview: () => void;
  onRemove: () => void;
}) {
  const tilt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(tilt, {
      toValue: isActive ? 1 : 0,
      duration: isActive ? 120 : 160,
      useNativeDriver: true,
    }).start();
  }, [isActive, tilt]);

  const rotate = tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-4deg'] });
  const scale = tilt.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <Animated.View style={[styles.thumbWrap, { transform: [{ rotate }, { scale }] }]}>
      <Pressable onLongPress={drag} delayLongPress={80} style={styles.thumbPressable} onPress={onPreview}>
        <Image source={{ uri: item.url }} style={styles.thumb} />
      </Pressable>
      {!isActive ? (
        <Pressable onPress={onRemove} style={styles.removeThumbBtn}>
          <ThemedText style={styles.removeThumbTxt}>Xóa</ThemedText>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export function PostCreateScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const navigation = useNavigation();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const queryClient = useQueryClient();
  const meQuery = useMeQuery();
  const isEditDraft = Boolean(postId);
  const isMember = meQuery.data?.role === 'MEMBER';
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const formShakeRef = useRef<ShakeViewHandle>(null);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [location, setLocation] = useState<ComposerLocation | null>(null);
  const [media, setMedia] = useState<EditorMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const loadedPostIdRef = useRef<string | null>(null);
  const createTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRetriedRef = useRef(false);
  const lastSaveTierRef = useRef<SaveTier>('core');
  const skipMediaAutosaveRef = useRef(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const viewerWidth = Math.round(screenWidth);
  const viewerHeight = Math.round(screenHeight);

  useEffect(() => {
    if (meQuery.isLoading) return;
    if (meQuery.data?.role !== 'MEMBER') {
      router.replace('/(auth)/login');
    }
  }, [meQuery.isLoading, meQuery.data?.role, router]);

  const editingPostQuery = useQuery({
    queryKey: ['posts', postId],
    queryFn: () => postsService.getPost(String(postId)),
    enabled: Boolean(postId) && isMember,
  });

  const postMetaPayload = useMemo(() => {
    const normalizedTags = dedupeTags(tags);
    const trimmedCategory = category.trim();
    return {
      category: trimmedCategory || undefined,
      tags: normalizedTags.length ? normalizedTags : undefined,
      visibility,
    };
  }, [category, tags, visibility]);

  const locationPayload = useCallback(
    (forUpdate: boolean) => {
      if (location) {
        return { location: { name: location.name, lat: location.lat, lng: location.lng } };
      }
      return forUpdate ? { location: null as { name?: string; lat?: number; lng?: number } | null } : {};
    },
    [location],
  );

  const buildSubmitContentHtml = useCallback(
    (forPublish: boolean) => {
      const trimmed = contentHtml.trim();
      if (forPublish) return mergeHashtagsIntoContentHtml(trimmed, tags);
      return stripTrailingHashtagBlock(trimmed);
    },
    [contentHtml, tags],
  );

  useFocusEffect(
    useCallback(() => {
      usePostComposerHandoffStore.getState().setReturnPostId(postId ? String(postId) : null);
      const pending = usePostComposerHandoffStore.getState().takePending();
      if (!pending?.length) return;
      setMedia((prev) => [...pending, ...prev]);
    }, [postId]),
  );

  const isPublishedDraft = editingPostQuery.data?.status === 'PUBLISHED';

  useEffect(() => {
    if (!postId || !editingPostQuery.data) return;
    if (loadedPostIdRef.current === postId) return;
    if (editingPostQuery.data.status === 'PUBLISHED') {
      router.replace(`/(tabs)/posts/${postId}`);
      return;
    }
    loadedPostIdRef.current = postId;
    skipMediaAutosaveRef.current = true;
    setTitle(editingPostQuery.data.title);
    setCategory(editingPostQuery.data.category ?? '');
    const fromApi = editingPostQuery.data.tags ?? [];
    const fromContent = parseTagsFromContentHtml(editingPostQuery.data.contentHtml);
    setTags(dedupeTags([...fromApi, ...fromContent]));
    setContentHtml(stripTrailingHashtagBlock(editingPostQuery.data.contentHtml));
    setVisibility(editingPostQuery.data.visibility ?? 'PUBLIC');
    const loc = editingPostQuery.data.location;
    if (loc && typeof loc.name === 'string' && loc.name.trim()) {
      const lat = typeof loc.lat === 'number' ? loc.lat : Number(loc.lat);
      const lng = typeof loc.lng === 'number' ? loc.lng : Number(loc.lng);
      setLocation({
        name: loc.name,
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
      });
    } else {
      setLocation(null);
    }
    setMedia(
      editingPostQuery.data.media.map((m, idx) => ({
        localId: `${Date.now()}-${idx}`,
        mediaId: m.id,
        type: m.type ?? 'image',
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        previewUrl: m.previewUrl,
        originalUrl: m.originalUrl,
        placeholder: m.placeholder,
        width: m.width,
        height: m.height,
        compositionId: m.compositionId,
      })),
    );
  }, [postId, editingPostQuery.data, router]);

  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');

  const mapSubmitMedia = useCallback((items: EditorMedia[]) => {
    return items.map(
      ({ type, url, thumbnailUrl, previewUrl, originalUrl, placeholder, width, height, compositionId, mediaId }) => {
        const row: {
          mediaId?: string;
          type: EditorMedia['type'];
          url: string;
          thumbnailUrl?: string;
          previewUrl?: string;
          originalUrl?: string;
          placeholder?: string;
          width?: number;
          height?: number;
          compositionId?: string;
        } = { type, url, thumbnailUrl, previewUrl, originalUrl, placeholder, width, height, compositionId };
        if (mediaId) row.mediaId = mediaId;
        return row;
      },
    );
  }, []);

  const saveDraftMutation = useMutation({
    mutationFn: async (opts?: { forPublish?: boolean; silent?: boolean; tier?: SaveTier }) => {
      const forPublish = opts?.forPublish ?? false;
      const tier = opts?.tier ?? 'core';
      const html = buildSubmitContentHtml(forPublish);
      const draftHtml = html || EMPTY_DRAFT_HTML;

      if (!title.trim()) throw new Error(t('postsValidationTitle'));
      if (forPublish && !html) throw new Error(t('postsValidationContent'));

      const shouldUploadMedia = tier === 'media' || forPublish;

      let submitMedia: ReturnType<typeof mapSubmitMedia> | undefined;
      if (shouldUploadMedia) {
        const uploadedMedia = await uploadAllPendingMedia(media);
        setMedia(uploadedMedia);
        submitMedia = mapSubmitMedia(uploadedMedia);
      }

      const base = {
        title: title.trim(),
        contentHtml: forPublish ? html : draftHtml,
        ...postMetaPayload,
        ...locationPayload(Boolean(postId)),
      };

      if (postId) {
        return postsService.updatePost(String(postId), {
          ...base,
          ...(submitMedia !== undefined ? { media: submitMedia } : {}),
        });
      }

      return postsService.createPost({
        ...base,
        media: submitMedia ?? [],
        status: 'DRAFT',
      });
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      if (variables?.silent) {
        setAutoSaveStatus('saved');
        setAutoSaveError(null);
        autoSaveRetriedRef.current = false;
        if (data?.id && !postId) {
          router.setParams({ postId: data.id });
        }
        return;
      }
      if (!variables?.forPublish) {
        router.back();
      }
    },
    onMutate: (variables) => {
      if (variables?.silent) {
        setAutoSaveStatus('saving');
        setAutoSaveError(null);
      }
    },
    onError: (e: unknown, variables) => {
      if (!variables?.silent) {
        formShakeRef.current?.shake();
        setError(formatApiError(e, 'Không thể lưu bài viết.'));
      } else {
        const msg = formatApiError(e, t('postsAutoSaveFailed'));
        setAutoSaveError(msg);
        const tier = variables?.tier ?? lastSaveTierRef.current;
        if (!autoSaveRetriedRef.current) {
          autoSaveRetriedRef.current = true;
          setTimeout(() => saveDraftMutateRef.current({ silent: true, tier }), 2000);
        }
      }
      setAutoSaveStatus('idle');
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const draft = await saveDraftMutation.mutateAsync({ forPublish: true });
      return postsService.publishPost(draft.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      router.replace('/(tabs)/posts');
    },
    onError: (e: unknown) => {
      formShakeRef.current?.shake();
      setError(formatApiError(e, 'Không thể xuất bản bài viết.'));
    },
  });

  const saveDraftMutateRef = useRef(saveDraftMutation.mutate);
  saveDraftMutateRef.current = saveDraftMutation.mutate;

  const deleteDraftMutation = useMutation({
    mutationFn: () => postsService.deletePost(String(postId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      router.back();
    },
    onError: (e: unknown) => setError(formatApiError(e, 'Không thể xóa bản nháp.')),
  });

  const handlePublishPress = useCallback(() => {
    setError(null);
    publishMutation.mutate();
  }, [publishMutation]);

  const autosaveBlocked =
    isPublishedDraft || publishMutation.isPending || saveDraftMutation.isPending;

  const scheduleSave = useCallback(
    (tier: SaveTier, delayMs: number, ref: MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
      if (autosaveBlocked) return;
      if (ref.current) clearTimeout(ref.current);
      ref.current = setTimeout(() => {
        lastSaveTierRef.current = tier;
        saveDraftMutateRef.current({ silent: true, tier });
      }, delayMs);
    },
    [autosaveBlocked],
  );

  useEffect(() => {
    if (autosaveBlocked || postId || !title.trim()) return;
    scheduleSave('create', 2500, createTimerRef);
    return () => {
      if (createTimerRef.current) clearTimeout(createTimerRef.current);
    };
  }, [title, postId, autosaveBlocked, scheduleSave]);

  useEffect(() => {
    if (autosaveBlocked || !postId) return;
    scheduleSave('meta', 1000, metaTimerRef);
    return () => {
      if (metaTimerRef.current) clearTimeout(metaTimerRef.current);
    };
  }, [postId, category, tags, visibility, location, autosaveBlocked, scheduleSave]);

  useEffect(() => {
    if (autosaveBlocked || !postId) return;
    scheduleSave('core', 2500, coreTimerRef);
    return () => {
      if (coreTimerRef.current) clearTimeout(coreTimerRef.current);
    };
  }, [postId, title, contentHtml, autosaveBlocked, scheduleSave]);

  useEffect(() => {
    if (autosaveBlocked || !postId) return;
    if (skipMediaAutosaveRef.current) {
      skipMediaAutosaveRef.current = false;
      return;
    }
    scheduleSave('media', 2500, mediaTimerRef);
    return () => {
      if (mediaTimerRef.current) clearTimeout(mediaTimerRef.current);
    };
  }, [postId, media, autosaveBlocked, scheduleSave]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: isEditDraft
        ? () => (
            <PressableScale
              onPress={handlePublishPress}
              disabled={saveDraftMutation.isPending || publishMutation.isPending}
              style={styles.headerPublishBtn}>
              <ThemedText style={styles.headerPublishTxt}>{t('postsPublishNow')}</ThemedText>
            </PressableScale>
          )
        : undefined,
    });
  }, [navigation, isEditDraft, saveDraftMutation.isPending, publishMutation.isPending, handlePublishPress, t]);

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets.length) return;
    for (const a of picked.assets) {
      const kind = a.type === 'video' ? 'video' : 'image';
      setMedia((prev) => [
        ...prev,
        {
          localId: `${Date.now()}-${Math.random()}`,
          type: kind,
          url: a.uri,
          width: a.width,
          height: a.height,
          pendingUpload: true,
          mimeType: a.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
          fileName: a.fileName ?? undefined,
        },
      ]);
    }
  };

  const renderMediaItem = ({ item, drag, isActive }: RenderItemParams<EditorMedia>) => (
    <DraggableMediaThumb
      item={item}
      isActive={isActive}
      drag={drag}
      onPreview={() => {
        if (draggingId) return;
        const idx = media.findIndex((m) => m.localId === item.localId);
        setPreviewIndex(idx >= 0 ? idx : 0);
      }}
      onRemove={() => setMedia((prev) => prev.filter((m) => m.localId !== item.localId))}
    />
  );

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.editorTopRow}>
          <View style={styles.editorTopLeft}>
            <ThemedText style={[styles.label, { color: muted }]}>
              {isEditDraft ? 'Chỉnh sửa bản nháp' : t('postsTitleLabel')}
            </ThemedText>
            {autoSaveStatus === 'saving' ? (
              <ThemedText style={[styles.autoSaveHint, { color: muted }]}>{t('postsAutoSaving')}</ThemedText>
            ) : autoSaveStatus === 'saved' ? (
              <ThemedText style={[styles.autoSaveHint, { color: muted }]}>{t('postsAutoSaved')}</ThemedText>
            ) : autoSaveError ? (
              <Pressable
                onPress={() => saveDraftMutateRef.current({ silent: true, tier: lastSaveTierRef.current })}
                hitSlop={8}>
                <ThemedText style={[styles.autoSaveHint, { color: '#b91c1c' }]}>
                  {autoSaveError} · {t('postsAutoSaveRetry')}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
          {isEditDraft ? (
            <Pressable
              onPress={() =>
                Alert.alert('Xóa bản nháp', 'Bạn muốn xóa bản nháp này?', [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('postDeleteAction'), style: 'destructive', onPress: () => deleteDraftMutation.mutate() },
                ])
              }
              disabled={deleteDraftMutation.isPending}
              style={styles.deleteDraftTopBtn}>
              <ThemedText style={styles.deleteDraftTxt}>{t('postDeleteAction')}</ThemedText>
            </Pressable>
          ) : null}
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('postsTitlePlaceholder')}
          placeholderTextColor={muted}
          style={[styles.titleInput, { borderColor: border, color: text, backgroundColor: card }]}
        />
        <ThemedText style={[styles.label, { color: muted }]}>{t('postsContentLabel')}</ThemedText>
          <TextInput
            value={contentHtml}
            onChangeText={setContentHtml}
            placeholder={t('postsContentPlaceholder')}
            placeholderTextColor={muted}
            multiline
            style={[styles.contentInput, { borderColor: border, color: text, backgroundColor: card }]}
          />

        <PostCategoryPicker value={category} onChange={setCategory} />

        <ThemedText style={[styles.label, { color: muted }]}>{t('postsTagsLabel')}</ThemedText>
        <HashtagChipInput
          tags={tags}
          onChangeTags={setTags}
          placeholder={t('postsTagsPlaceholder')}
        />

        <ThemedText style={[styles.label, { color: muted }]}>{t('postsVisibilityLabel')}</ThemedText>
        <View style={styles.chipRow}>
          {(['PUBLIC', 'PRIVATE'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setVisibility(value)}
              style={[
                styles.chip,
                {
                  borderColor: visibility === value ? cta : border,
                  backgroundColor: visibility === value ? `${cta}18` : card,
                },
              ]}>
              <ThemedText style={styles.chipTxt}>
                {value === 'PUBLIC' ? t('postsVisibilityPublic') : t('postsVisibilityPrivate')}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <PostLocationPicker value={location} onChange={setLocation} />

        <View style={styles.row}>
          <Pressable onPress={() => void pickMedia()} style={[styles.mediaBtn, { borderColor: border }]}>
            <IconSymbol name="video.fill" size={18} color={text} />
            <ThemedText style={styles.mediaBtnTxt}>+ Ảnh/Video</ThemedText>
          </Pressable>
        </View>
        {media.length ? (
          <DraggableFlatList
            data={media}
            horizontal
            keyExtractor={(item) => item.localId}
            renderItem={renderMediaItem}
            onDragEnd={({ data }) => setMedia(data)}
            onDragBegin={(index) => setDraggingId(media[index]?.localId ?? null)}
            onRelease={() => setDraggingId(null)}
            activationDistance={4}
            dragItemOverflow
            autoscrollThreshold={48}
            autoscrollSpeed={90}
            containerStyle={styles.mediaList}
            contentContainerStyle={styles.mediaRow}
          />
        ) : null}

        <ShakeView ref={formShakeRef}>
          {error ? (
            <ThemedText style={styles.err} lightColor="#c00" darkColor="#f66">
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.actionRow}>
            {!isEditDraft ? (
              <PressableScale
                onPress={handlePublishPress}
                disabled={saveDraftMutation.isPending || publishMutation.isPending}
                style={[styles.submit, { backgroundColor: cta }]}>
                {publishMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.submitTxt}>{t('postsPublishNow')}</ThemedText>
                )}
              </PressableScale>
            ) : null}
          </View>
        </ShakeView>
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal transparent visible={previewIndex !== null} animationType="fade" onRequestClose={() => setPreviewIndex(null)}>
        <View style={styles.previewBackdrop}>
          <FlatList
            data={media}
            horizontal
            pagingEnabled
            style={styles.previewList}
            initialScrollIndex={Math.max(previewIndex ?? 0, 0)}
            getItemLayout={(_data, index) => ({ index, length: viewerWidth, offset: viewerWidth * index })}
            keyExtractor={(item) => `preview-${item.localId}`}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const mediaFrame = getContainedMediaFrame({
                source: item,
                maxWidth: viewerWidth - 24,
                maxHeight: viewerHeight * 0.82,
              });

              return (
                <View style={[styles.previewItem, { width: viewerWidth }]}>
                  <Pressable style={styles.previewCloseBand} onPress={() => setPreviewIndex(null)} />
                  <View style={[styles.previewMediaRow, { height: mediaFrame.height }]}>
                    <Pressable style={styles.previewSideCloseBand} onPress={() => setPreviewIndex(null)} />
                    <View style={[styles.previewMediaBox, mediaFrame]}>
                      <Image source={{ uri: item.url }} style={styles.previewImage} resizeMode="contain" />
                    </View>
                    <Pressable style={styles.previewSideCloseBand} onPress={() => setPreviewIndex(null)} />
                  </View>
                  <Pressable style={styles.previewCloseBand} onPress={() => setPreviewIndex(null)} />
                </View>
              );
            }}
          />
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  label: { fontSize: 13, marginTop: 6 },
  editorTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  editorTopLeft: { flex: 1, gap: 2 },
  autoSaveHint: { fontSize: 11, marginTop: 2 },
  titleInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  contentInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    minHeight: 220,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipTxt: { fontSize: 12, fontWeight: '600' },
  metaInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  mediaList: { marginTop: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbPressable: { borderRadius: 10, overflow: 'hidden' },
  mediaBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 8,
  },
  mediaBtnTxt: { fontWeight: '600' },
  err: { marginTop: 4 },
  submit: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  submitGhost: { borderWidth: StyleSheet.hairlineWidth, backgroundColor: 'transparent' },
  actionRow: { flexDirection: 'row', gap: 10 },
  thumbWrap: { borderRadius: 10, overflow: 'visible' },
  submitTxt: { color: '#fff', fontWeight: '600', fontSize: 16 },
  deleteDraftTopBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#EF4444' },
  deleteDraftTxt: { color: '#EF4444', fontWeight: '600' },
  removeThumbBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(2,6,23,0.76)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  removeThumbTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },
  previewBackdrop: { flex: 1, backgroundColor: 'rgba(2,6,23,0.86)' },
  previewList: { flex: 1 },
  previewItem: { flex: 1 },
  previewCloseBand: { flex: 1 },
  previewMediaRow: { flexDirection: 'row', alignItems: 'center' },
  previewSideCloseBand: { flex: 1, alignSelf: 'stretch' },
  previewMediaBox: { alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  headerPublishBtn: {
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerPublishTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
