import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { InputClearButton } from './ClearableTextInput';
import { commitCustomOption } from './plan-create-option';

export type PlanOptionChipItem<T extends string> = { id: T; label: string };

export type PlanOptionChipsProps<T extends string> = {
  options: readonly PlanOptionChipItem<T>[];
  selectedId: T | null;
  customLabel: string | null;
  customSelected: boolean;
  onSelectKnown: (id: T) => void;
  onCommitCustom: (label: string) => void;
  onSelectCustom: () => void;
  placeholder: string;
  inputA11yLabel: string;
};

/** Preset chips plus an inline type-in that stays in the same wrap row. */
export function PlanOptionChips<T extends string>({
  options,
  selectedId,
  customLabel,
  customSelected,
  onSelectKnown,
  onCommitCustom,
  onSelectCustom,
  placeholder,
  inputA11yLabel,
}: PlanOptionChipsProps<T>) {
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const card = useThemeColor({}, 'card');

  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const skipCommitRef = useRef(false);

  const labels = Object.fromEntries(options.map((o) => [o.id, o.label])) as Record<T, string>;
  const ids = options.map((o) => o.id);

  const commit = (raw: string) => {
    const result = commitCustomOption(raw, ids, labels);
    if (result.kind === 'empty') return;
    if (result.kind === 'known') onSelectKnown(result.id);
    else onCommitCustom(result.label);
    setDraft('');
  };

  const onChangeText = (value: string) => {
    if (value.endsWith(',')) {
      commit(value);
      return;
    }
    setDraft(value);
  };

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = !customSelected && opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelectKnown(opt.id)}
            style={[
              styles.chip,
              {
                borderColor: active ? tint : border,
                backgroundColor: active ? `${tint}18` : 'transparent',
              },
            ]}>
            <Text style={{ color: active ? tint : muted, fontWeight: '600', fontSize: 13 }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}

      {customLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: customSelected }}
          onPress={onSelectCustom}
          style={[
            styles.chip,
            {
              borderColor: customSelected ? tint : border,
              backgroundColor: customSelected ? `${tint}18` : 'transparent',
            },
          ]}>
          <Text
            style={{ color: customSelected ? tint : muted, fontWeight: '600', fontSize: 13 }}
            numberOfLines={1}>
            {customLabel}
          </Text>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.inputChip,
          {
            borderColor: focused ? tint : border,
            borderBottomColor: focused ? tint : muted,
            backgroundColor: card,
          },
        ]}>
        <MaterialIcons name="edit" size={14} color={focused ? tint : muted} />
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={onChangeText}
          onSubmitEditing={() => commit(draft)}
          onFocus={() => {
            setFocused(true);
            skipCommitRef.current = false;
          }}
          onBlur={() => {
            setFocused(false);
            if (skipCommitRef.current) return;
            commit(draft);
          }}
          placeholder={placeholder}
          placeholderTextColor={muted}
          accessibilityLabel={inputA11yLabel}
          returnKeyType="done"
          autoCapitalize="sentences"
          underlineColorAndroid="transparent"
          style={[styles.input, { color: text }, draft.length > 0 ? styles.inputClearPad : null]}
        />
        {draft.length > 0 ? (
          <InputClearButton
            compact
            onTouchStart={() => {
              skipCommitRef.current = true;
            }}
            onPress={() => {
              setDraft('');
              inputRef.current?.focus();
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderBottomWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 96,
    maxWidth: 148,
    minHeight: 36,
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 56,
    paddingVertical: 4,
    paddingHorizontal: 0,
    margin: 0,
    fontSize: 13,
    fontWeight: '600',
    minHeight: 24,
    textAlignVertical: 'center',
  },
  inputClearPad: { paddingRight: 28 },
});
