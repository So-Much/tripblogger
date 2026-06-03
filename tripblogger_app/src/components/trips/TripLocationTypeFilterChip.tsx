import { StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/src/components/feedback/PressableScale';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { LocationTypeRef } from '@/src/utils/location-type-display';
import { resolveLocationTypeVisual } from '@/src/utils/location-type-display';

type TripLocationTypeFilterChipProps = {
  type: LocationTypeRef & { code: string };
  selected: boolean;
  onPress: () => void;
};

export function TripLocationTypeFilterChip({ type, selected, onPress }: TripLocationTypeFilterChipProps) {
  const visual = resolveLocationTypeVisual(type);
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textMuted');
  const onCta = useThemeColor({}, 'onCta');

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.tile,
        {
          backgroundColor: selected ? visual.softBg : card,
          borderColor: selected ? visual.color : border,
        },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={type.name}>
      {selected ? (
        <View style={[styles.check, { backgroundColor: visual.color }]}>
          <MaterialIcons name="check" size={12} color={onCta} />
        </View>
      ) : null}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: selected ? `${visual.color}22` : `${visual.color}14`,
          },
        ]}>
        <MaterialIcons name={visual.icon} size={22} color={visual.color} />
      </View>
      <ThemedText
        style={[styles.label, { color: selected ? visual.color : muted }]}
        numberOfLines={2}>
        {type.name}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});
