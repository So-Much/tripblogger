import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedTextInput } from '@/src/components/forms/ThemedTextInput';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useI18n } from '@/src/i18n';
import { useThemeColor } from '@/hooks/use-theme-color';

type TripCustomMarkerSheetProps = {
  visible: boolean;
  coords: { lat: number; lng: number } | null;
  initialName?: string;
  markerSaved: boolean;
  hasAnchor: boolean;
  inRoute: boolean;
  isStart?: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onSetAnchor: () => void;
  onAddToRoute: () => void;
  onDirections: () => void;
  onRemoveFromRoute?: () => void;
};

type ActionKey = 'directions' | 'add' | 'anchor' | 'remove';

export function TripCustomMarkerSheet({
  visible,
  coords,
  initialName = '',
  markerSaved,
  hasAnchor,
  inRoute,
  isStart = false,
  onClose,
  onSave,
  onSetAnchor,
  onAddToRoute,
  onDirections,
  onRemoveFromRoute,
}: TripCustomMarkerSheetProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');
  const cta = useThemeColor({}, 'cta');
  const onCta = useThemeColor({}, 'onCta');

  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  if (!coords) return null;

  const canAct = markerSaved && name.trim().length > 0;

  const actions: {
    key: ActionKey;
    label: string;
    icon: 'location.fill' | 'plus.circle.fill' | 'mappin.circle.fill' | 'trash.fill';
    onPress: () => void;
    danger?: boolean;
  }[] = [];

  if (canAct) {
    actions.push({
      key: 'directions',
      label: t('tripDirectionsShort'),
      icon: 'location.fill',
      onPress: () => onDirections(),
    });

    if (inRoute && !isStart) {
      actions.push({
        key: 'remove',
        label: t('tripRemoveRoute'),
        icon: 'trash.fill',
        onPress: () => onRemoveFromRoute?.(),
        danger: true,
      });
    } else if (!inRoute) {
      if (!hasAnchor) {
        actions.push({
          key: 'anchor',
          label: t('tripAnchorSet'),
          icon: 'mappin.circle.fill',
          onPress: () => onSetAnchor(),
        });
      } else {
        actions.push({
          key: 'add',
          label: t('tripAddRoute'),
          icon: 'plus.circle.fill',
          onPress: () => onAddToRoute(),
        });
        actions.push({
          key: 'anchor',
          label: t('tripAnchorSet'),
          icon: 'mappin.circle.fill',
          onPress: () => onSetAnchor(),
        });
      }
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: card, borderColor: border, paddingBottom: Math.max(insets.bottom, 12) },
        ]}>
        <View style={[styles.handle, { backgroundColor: muted }]} />
        <ThemedText type="subtitle">{t('tripCustomMarkerTitle')}</ThemedText>
        <ThemedText style={{ color: muted, fontSize: 12 }}>{t('tripCustomMarkerPrivateHint')}</ThemedText>

        <ThemedTextInput
          placeholder={t('tripCustomMarkerNamePlaceholder')}
          value={name}
          onChangeText={setName}
          autoFocus={!markerSaved}
        />

        <PressableScale
          style={[styles.saveBtn, { backgroundColor: cta, opacity: name.trim() ? 1 : 0.45 }]}
          disabled={!name.trim()}
          onPress={() => onSave(name.trim())}>
          <ThemedText style={{ color: onCta, fontWeight: '700' }}>
            {markerSaved ? t('tripCustomMarkerUpdate') : t('tripCustomMarkerSave')}
          </ThemedText>
        </PressableScale>

        {canAct && actions.length > 0 ? (
          <View style={styles.actionsRow}>
            {actions.map((action) => (
              <PressableScale
                key={action.key}
                style={[styles.actionChip, { borderColor: border }]}
                onPress={action.onPress}>
                <IconSymbol
                  name={action.icon}
                  size={18}
                  color={action.danger ? '#c62828' : tint}
                />
                <ThemedText
                  style={[styles.actionLabel, action.danger ? { color: '#c62828' } : undefined]}
                  numberOfLines={1}>
                  {action.label}
                </ThemedText>
              </PressableScale>
            ))}
          </View>
        ) : !markerSaved ? (
          <ThemedText style={{ color: muted, fontSize: 12, textAlign: 'center' }}>
            {t('tripCustomMarkerSaveFirst')}
          </ThemedText>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxWidth: '48%',
  },
  actionLabel: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
});
