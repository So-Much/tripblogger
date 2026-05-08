import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { postsService } from '@/src/services/api/posts.service';
import { formatApiError } from '@/src/utils/format-api-error';

export function PostCreateScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [publishDraft, setPublishDraft] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [error, setError] = useState<string | null>(null);

  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');

  const createMutation = useMutation({
    mutationFn: async () => {
      const html = contentHtml.trim();
      if (!title.trim()) throw new Error(t('postsValidationTitle'));
      if (!html) {
        throw new Error(t('postsValidationContent'));
      }
      return postsService.createPost({
        title: title.trim(),
        contentHtml: html,
        status: publishDraft,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['posts', 'mine'] });
      router.back();
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : formatApiError(e));
    },
  });

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText style={[styles.label, { color: muted }]}>{t('postsTitleLabel')}</ThemedText>
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
          <Pressable
            onPress={() => setPublishDraft('PUBLISHED')}
            style={[
              styles.toggle,
              { borderColor: border },
              publishDraft === 'PUBLISHED' && { borderColor: cta, backgroundColor: card },
            ]}>
            <ThemedText style={publishDraft === 'PUBLISHED' ? { fontWeight: '600' } : {}}>
              {t('postsPublishNow')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setPublishDraft('DRAFT')}
            style={[
              styles.toggle,
              { borderColor: border },
              publishDraft === 'DRAFT' && { borderColor: cta, backgroundColor: card },
            ]}>
            <ThemedText style={publishDraft === 'DRAFT' ? { fontWeight: '600' } : {}}>
              {t('postsSaveDraft')}
            </ThemedText>
          </Pressable>
        </View>

        {error ? (
          <ThemedText style={styles.err} lightColor="#c00" darkColor="#f66">
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={() => {
            setError(null);
            createMutation.mutate();
          }}
          disabled={createMutation.isPending}
          style={[styles.submit, { backgroundColor: cta }]}>
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.submitTxt}>{t('postsSubmit')}</ThemedText>
          )}
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  label: { fontSize: 13, marginTop: 6 },
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
  toggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  err: { marginTop: 4 },
  submit: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitTxt: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
