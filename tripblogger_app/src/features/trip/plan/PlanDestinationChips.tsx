import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useI18n } from '@/src/i18n';
import { ClearableTextInput } from './ClearableTextInput';
import { DESTINATION_CATALOG, filterDestinationCatalog } from './destination-catalog';
import {
  tryCommitDestination,
  type DestinationChip,
} from './plan-create-destination';

export type PlanDestinationChipsProps = {
  chips: DestinationChip[];
  onChangeChips: (chips: DestinationChip[]) => void;
  nudge: string | null;
  onNudge: (message: string | null) => void;
};

export function PlanDestinationChips({
  chips,
  onChangeChips,
  nudge,
  onNudge,
}: PlanDestinationChipsProps) {
  const { t } = useI18n();
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'textMuted');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const surface = useThemeColor({}, 'surface');

  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = draft.trim();
    const list = q ? filterDestinationCatalog(q) : [...DESTINATION_CATALOG];
    return list.slice(0, 4);
  }, [draft]);

  const showSuggestions = focused && suggestions.length > 0;

  const dismissSuggestions = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setFocused(false);
  };

  const commit = (raw: string) => {
    const result = tryCommitDestination(raw, chips);
    if (!result.ok) {
      if (result.reason === 'empty') return;
      if (result.reason === 'need_catalog') {
        onNudge(t('planCreateDestinationNeedCatalog'));
        return;
      }
      if (result.reason === 'label_too_long') {
        onNudge(t('planCreateDestinationLabelTooLong'));
        return;
      }
      return;
    }
    onChangeChips([...chips, result.chip]);
    setDraft('');
    onNudge(null);
    dismissSuggestions();
  };

  const onChangeText = (value: string) => {
    if (value.endsWith(',')) {
      commit(value.slice(0, -1));
      return;
    }
    setDraft(value);
  };

  const removeChip = (id: string) => {
    onChangeChips(chips.filter((c) => c.id !== id));
  };

  const onFocus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setFocused(true);
  };

  const onBlur = () => {
    // Delay so suggestion row presses register before the list unmounts.
    blurTimer.current = setTimeout(() => setFocused(false), 180);
  };

  return (
    <View style={styles.root}>
      <Text style={[styles.label, { color: muted }]}>{t('planCreateDestination')}</Text>
      <Text style={[styles.hint, { color: muted }]}>{t('planCreateDestinationHint')}</Text>

      {chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((chip) => (
            <View
              key={chip.id}
              style={[styles.destChip, { borderColor: border, backgroundColor: `${tint}12` }]}>
              <Text style={[styles.destChipText, { color: text }]} numberOfLines={1}>
                {chip.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('planRemoveDestination')}
                hitSlop={6}
                onPress={() => removeChip(chip.id)}>
                <MaterialIcons name="close" size={16} color={muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.inputWrap}>
        <ClearableTextInput
          value={draft}
          onChangeText={onChangeText}
          onSubmitEditing={() => commit(draft)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={t('planCreateDestinationPlaceholder')}
          accessibilityLabel={t('planCreateDestination')}
          returnKeyType="done"
          autoCapitalize="words"
          blurOnSubmit={false}
        />

        {showSuggestions ? (
          <View
            style={[
              styles.suggestions,
              { borderColor: border, backgroundColor: surface },
            ]}>
            <View style={[styles.suggestionsHeader, { borderBottomColor: border }]}>
              <Text style={[styles.suggestionsTitle, { color: muted }]}>
                {t('planCreateDestination')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('close')}
                onPress={dismissSuggestions}
                hitSlop={8}>
                <MaterialIcons name="close" size={18} color={muted} />
              </Pressable>
            </View>
            <View style={styles.suggestionsList}>
              {suggestions.map((entry) => (
                <Pressable
                  key={`${entry.name}-${entry.lat}-${entry.lng}`}
                  accessibilityRole="button"
                  onPress={() => commit(entry.name)}
                  style={[styles.suggestionRow, { borderBottomColor: border }]}>
                  <Text style={{ color: text, fontSize: 14 }}>{entry.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {nudge ? <Text style={[styles.nudge, { color: danger }]}>{nudge}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 16, marginTop: -4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  destChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
  },
  destChipText: { fontSize: 13, fontWeight: '600', maxWidth: 200 },
  nudge: { fontSize: 13 },
  inputWrap: { zIndex: 2 },
  suggestions: {
    marginTop: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 8,
    elevation: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionsTitle: { fontSize: 11, fontWeight: '600' },
  suggestionsList: { maxHeight: 176 },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
