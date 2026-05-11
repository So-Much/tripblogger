import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { postsService } from '@/src/services/api/posts.service';
import { formatApiError } from '@/src/utils/format-api-error';
import { getContainedMediaFrame } from '@/src/utils/media-viewer-layout';
import * as ImagePicker from 'expo-image-picker';

type EditorMedia = {
  localId: string;
  type: 'icon' | 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  originalUrl?: string;
  placeholder?: string;
  width?: number;
  height?: number;
};

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
      <Pressable onLongPress={drag} delayLongPress={170} style={styles.thumbPressable} onPress={onPreview}>
        <Image source={{ uri: item.url }} style={styles.thumb} />
        {isActive ? (
          <View style={styles.dragOverlay}>
            <ThemedText style={styles.dragOverlayText}>Đang di chuyển…</ThemedText>
          </View>
        ) : null}
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
  const isEditDraft = Boolean(postId);
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [media, setMedia] = useState<EditorMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const viewerWidth = Math.round(screenWidth);
  const viewerHeight = Math.round(screenHeight);

  const editingPostQuery = useQuery({
    queryKey: ['posts', postId],
    queryFn: () => postsService.getPost(String(postId)),
    enabled: Boolean(postId),
  });

  useEffect(() => {
    if (!isEditDraft || !editingPostQuery.data) return;
    setTitle(editingPostQuery.data.title);
    setContentHtml(editingPostQuery.data.contentHtml);
    setMedia(
      editingPostQuery.data.media.map((m, idx) => ({
        localId: `${Date.now()}-${idx}`,
        type: m.type ?? 'image',
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        previewUrl: m.previewUrl,
        originalUrl: m.originalUrl,
        placeholder: m.placeholder,
        width: m.width,
        height: m.height,
      })),
    );
  }, [isEditDraft, editingPostQuery.data]);

  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const html = contentHtml.trim();
      if (!title.trim()) throw new Error(t('postsValidationTitle'));
      if (!html) {
        throw new Error(t('postsValidationContent'));
      }
      const submitMedia = media.map(({ type, url, thumbnailUrl, previewUrl, originalUrl, placeholder, width, height }) => ({
        type,
        url,
        thumbnailUrl,
        previewUrl,
        originalUrl,
        placeholder,
        width,
        height,
      }));
      if (postId) {
        return postsService.updatePost(String(postId), { title: title.trim(), contentHtml: html, media: submitMedia });
      }
      return postsService.createPost({ title: title.trim(), contentHtml: html, media: submitMedia, status: 'DRAFT' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      router.back();
    },
    onError: (e: unknown) => {
      setError(formatApiError(e, 'Không thể lưu bài viết.'));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const draft = await saveDraftMutation.mutateAsync();
      return postsService.publishPost(draft.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      router.replace('/(tabs)/posts');
    },
    onError: (e: unknown) => {
      setError(formatApiError(e, 'Không thể xuất bản bài viết.'));
    },
  });

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

  useEffect(() => {
    navigation.setOptions({
      headerRight: isEditDraft
        ? () => (
            <Pressable
              onPress={handlePublishPress}
              disabled={saveDraftMutation.isPending || publishMutation.isPending}
              style={styles.headerPublishBtn}>
              <ThemedText style={styles.headerPublishTxt}>{t('postsPublishNow')}</ThemedText>
            </Pressable>
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
      const uploaded = await postsService.uploadMedia(
        {
          uri: a.uri,
          name: a.fileName ?? `${kind}-${Date.now()}.${kind === 'video' ? 'mp4' : 'jpg'}`,
          type: a.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
        },
        kind,
      );
      setMedia((prev) => [
        ...prev,
        {
          localId: `${Date.now()}-${Math.random()}`,
          type: kind,
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl,
          previewUrl: uploaded.previewUrl,
          originalUrl: uploaded.originalUrl,
          placeholder: uploaded.placeholder,
          width: uploaded.width,
          height: uploaded.height,
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
          <ThemedText style={[styles.label, { color: muted }]}>
            {isEditDraft ? 'Chỉnh sửa bản nháp' : t('postsTitleLabel')}
          </ThemedText>
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
            activationDistance={12}
            containerStyle={styles.mediaList}
            contentContainerStyle={styles.mediaRow}
          />
        ) : null}

        {error ? (
          <ThemedText style={styles.err} lightColor="#c00" darkColor="#f66">
            {error}
          </ThemedText>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              setError(null);
              saveDraftMutation.mutate();
            }}
            disabled={saveDraftMutation.isPending || publishMutation.isPending}
            style={[styles.submit, styles.submitGhost, { borderColor: border }]}>
            {saveDraftMutation.isPending ? (
              <ActivityIndicator />
            ) : (
              <ThemedText>{isEditDraft ? 'Lưu' : t('postsSaveDraft')}</ThemedText>
            )}
          </Pressable>
          {!isEditDraft ? (
            <Pressable
              onPress={handlePublishPress}
              disabled={saveDraftMutation.isPending || publishMutation.isPending}
              style={[styles.submit, { backgroundColor: cta }]}>
              {publishMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.submitTxt}>{t('postsPublishNow')}</ThemedText>
              )}
            </Pressable>
          ) : null}
        </View>
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
  editorTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragOverlayText: { color: '#fff', fontSize: 10, fontWeight: '700' },
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
