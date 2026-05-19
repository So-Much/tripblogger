import { useCallback, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { dedupeTags, normalizeTagName } from '@/src/utils/post-hashtag-content';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_TAGS = 30;

type HashtagChipInputProps = {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
  placeholder?: string;
  editable?: boolean;
};

function commitSegment(segment: string, existing: string[]): string[] {
  const normalized = normalizeTagName(segment);
  if (!normalized) return existing;
  return dedupeTags([...existing, normalized]).slice(0, MAX_TAGS);
}

function commitManyFromText(text: string, existing: string[]): string[] {
  let next = [...existing];
  const parts = text.split(/\s+/).filter(Boolean);
  for (const part of parts) {
    if (part.startsWith('#')) {
      next = commitSegment(part, next);
    }
  }
  return next;
}

export function HashtagChipInput({
  tags,
  onChangeTags,
  placeholder = '#Travel',
  editable = true,
}: HashtagChipInputProps) {
  const [draft, setDraft] = useState('');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');
  const pendingCommit = useRef('');

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const commitDraft = useCallback(
    (segment: string) => {
      const next = commitSegment(segment, tags);
      if (next.length === tags.length && segment) return false;
      animateLayout();
      onChangeTags(next);
      return true;
    },
    [onChangeTags, tags],
  );

  const removeTag = (tag: string) => {
    animateLayout();
    onChangeTags(tags.filter((t) => t !== tag));
  };

  const handleChangeText = (value: string) => {
    if (!editable) return;

    if (value.length < draft.length && draft === '#' && tags.length > 0) {
      const last = tags[tags.length - 1];
      setDraft(`#${last}`);
      removeTag(last);
      return;
    }

    if (/[\s,;]/.test(value) && value.includes('#')) {
      const parts = value.split(/[\s,;]+/);
      const tail = parts.pop() ?? '';
      let nextTags = tags;
      for (const part of parts) {
        if (part.includes('#')) nextTags = commitManyFromText(part, nextTags);
        else if (part) nextTags = commitSegment(part, nextTags);
      }
      animateLayout();
      onChangeTags(nextTags);
      setDraft(tail.startsWith('#') || tail === '' ? tail : `#${tail}`);
      return;
    }

    if (value && !value.includes('#')) {
      setDraft(`#${value.replace(/^#+/, '')}`);
      return;
    }

    setDraft(value);

    const invalid = value.match(/#[^A-Za-z0-9_\s,#;]*([^A-Za-z0-9_\s#;,]|$)/);
    if (invalid && invalid[1]) {
      const cut = value.slice(0, value.indexOf(invalid[1]));
      const token = cut.slice(cut.lastIndexOf('#'));
      if (token.length > 1) commitDraft(token);
      setDraft('');
    }
  };

  const handleSubmitEditing = () => {
    if (draft.trim()) commitDraft(draft.trim());
    setDraft('');
  };

  const handleBlur = () => {
    if (pendingCommit.current === draft) return;
    pendingCommit.current = draft;
    if (draft.trim().length > 1) commitDraft(draft.trim());
    setDraft('');
  };

  return (
    <View style={[styles.wrap, { borderColor: border, backgroundColor: card }]}>
      <View style={styles.chipRow}>
        {tags.map((tag) => (
          <View key={tag} style={[styles.chip, { borderColor: border, backgroundColor: `${cta}14` }]}>
            <ThemedText style={[styles.chipLabel, { color: text }]}>#{tag}</ThemedText>
            {editable ? (
              <Pressable
                onPress={() => removeTag(tag)}
                hitSlop={8}
                accessibilityLabel={`Remove ${tag}`}
                style={styles.chipRemove}>
                <ThemedText style={[styles.chipRemoveTxt, { color: muted }]}>×</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ))}
        {editable ? (
          <TextInput
            value={draft}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmitEditing}
            onBlur={handleBlur}
            placeholder={tags.length ? '' : placeholder}
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: text, minWidth: tags.length ? 72 : 120 }]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 5,
    gap: 2,
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  chipRemove: { paddingHorizontal: 6, paddingVertical: 2 },
  chipRemoveTxt: { fontSize: 16, lineHeight: 18, fontWeight: '600' },
  input: {
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 4,
    flexGrow: 1,
  },
});
