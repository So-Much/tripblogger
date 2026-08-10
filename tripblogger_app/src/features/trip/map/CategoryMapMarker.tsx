import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';
import { resolvePlaceCategoryVisual } from '@/src/utils/location-type-display';

type Props = {
  category?: string | null;
  selected?: boolean;
  size?: number;
};

/** Compact circular pin used on the trip map for category-aware POI markers. */
export function CategoryMapMarker({ category, selected = false, size = 32 }: Props) {
  const visual = resolvePlaceCategoryVisual(category);
  const iconSize = Math.round(size * 0.5);
  const borderW = selected ? 2.5 : 1.5;

  return (
    <View
      collapsable={false}
      style={[
        styles.wrap,
        {
          width: size + 4,
          height: size + 8,
        },
      ]}>
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: visual.color,
            borderWidth: borderW,
            borderColor: selected ? '#FFFFFF' : `${visual.color}`,
          },
          selected && styles.selectedShadow,
        ]}>
        <MaterialIcons name={visual.icon} size={iconSize} color="#FFFFFF" />
      </View>
      <View style={[styles.tip, { borderTopColor: visual.color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  selectedShadow: {
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  tip: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
