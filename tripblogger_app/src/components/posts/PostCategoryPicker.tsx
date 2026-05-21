import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { TRAVEL_CATEGORIES, TRAVEL_CATEGORY_OTHER } from '@/src/constants/travel-categories';
import { ComposerBottomSheet } from '@/src/components/posts/ComposerBottomSheet';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { IconSymbol } from '@/components/ui/icon-symbol';

type PostCategoryPickerProps = {
  value: string;
  onChange: (category: string) => void;
};

export function PostCategoryPicker({ value, onChange }: PostCategoryPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [otherText, setOtherText] = useState('');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const cta = useThemeColor({}, 'cta');

  useEffect(() => {
    if (!open) return;
    const preset = TRAVEL_CATEGORIES.includes(value as (typeof TRAVEL_CATEGORIES)[number])
      ? value
      : value
        ? TRAVEL_CATEGORY_OTHER
        : '';
    setDraft(preset);
    setOtherText(preset === TRAVEL_CATEGORY_OTHER && value !== TRAVEL_CATEGORY_OTHER ? value : '');
  }, [open, value]);

  const displayValue = value.trim() || t('postsCategoryPlaceholder');

  const commit = () => {
    if (draft === TRAVEL_CATEGORY_OTHER) {
      const custom = otherText.trim();
      onChange(custom || TRAVEL_CATEGORY_OTHER);
    } else {
      onChange(draft);
    }
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: border, backgroundColor: card }]}
        accessibilityRole="button">
        <View style={styles.triggerText}>
          <ThemedText style={[styles.triggerLabel, { color: muted }]}>{t('postsCategoryLabel')}</ThemedText>
          <ThemedText style={{ color: value ? text : muted }} numberOfLines={1}>
            {displayValue}
          </ThemedText>
        </View>
        <IconSymbol name="chevron.right" size={16} color={muted} />
      </Pressable>

      <ComposerBottomSheet
        visible={open}
        title={t('postsCategorySheetTitle')}
        onClose={() => setOpen(false)}
        footer={
          <PressableScale style={[styles.doneBtn, { backgroundColor: cta }]} onPress={commit}>
            <ThemedText style={styles.doneTxt}>{t('postsSheetDone')}</ThemedText>
          </PressableScale>
        }
        contentStyle={{ paddingBottom: 8 }}>
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {TRAVEL_CATEGORIES.map((item) => {
            const selected = draft === item;
            return (
              <Pressable
                key={item}
                onPress={() => setDraft(item)}
                style={[styles.option, { borderColor: selected ? cta : border, backgroundColor: card }]}>
                <View style={[styles.radio, { borderColor: selected ? cta : border }]}>
                  {selected ? <View style={[styles.radioDot, { backgroundColor: cta }]} /> : null}
                </View>
                <ThemedText style={{ color: text }}>{item}</ThemedText>
              </Pressable>
            );
          })}
          {draft === TRAVEL_CATEGORY_OTHER ? (
            <TextInput
              value={otherText}
              onChangeText={setOtherText}
              placeholder={t('postsCategoryOtherPlaceholder')}
              placeholderTextColor={muted}
              style={[styles.otherInput, { borderColor: border, color: text, backgroundColor: card }]}
            />
          ) : null}
        </ScrollView>
      </ComposerBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  triggerText: { flex: 1, gap: 2, minWidth: 0 },
  triggerLabel: { fontSize: 12 },
  list: { maxHeight: 360 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  otherInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
  },
  doneBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  doneTxt: { color: '#fff', fontWeight: '700' },
});
