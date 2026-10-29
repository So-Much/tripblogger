import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';
import { resolveLocationTypeVisual, type LocationTypeRef } from '@/src/utils/location-type-display';

type LocationTypeIconProps = {
  locationType?: LocationTypeRef | null;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
};

const SIZES = {
  sm: { box: 32, icon: 16 },
  md: { box: 40, icon: 20 },
  lg: { box: 48, icon: 24 },
} as const;

export function LocationTypeIcon({ locationType, size = 'md', selected = false }: LocationTypeIconProps) {
  const visual = resolveLocationTypeVisual(locationType);
  const dim = SIZES[size];

  return (
    <View
      style={[
        styles.box,
        {
          width: dim.box,
          height: dim.box,
          borderRadius: dim.box * 0.28,
          backgroundColor: visual.softBg,
          borderColor: selected ? visual.color : 'transparent',
          borderWidth: selected ? 2 : 0,
        },
      ]}>
      <MaterialIcons name={visual.icon} size={dim.icon} color={visual.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
