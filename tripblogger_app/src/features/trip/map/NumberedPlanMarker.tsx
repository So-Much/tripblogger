import { StyleSheet, Text, View } from 'react-native';

type Props = {
  number: number;
  color: string;
  textColor: string;
  size?: number;
};

/** Numbered pin for plan-day stops on the map (separate layer from nearby POIs). */
export function NumberedPlanMarker({
  number,
  color,
  textColor,
  size = 30,
}: Props) {
  return (
    <View
      collapsable={false}
      style={[styles.wrap, { width: size + 4, height: size + 8 }]}>
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}>
        <Text style={[styles.label, { color: textColor, fontSize: size * 0.42 }]}>
          {number}
        </Text>
      </View>
      <View style={[styles.tip, { borderTopColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  label: { fontWeight: '800' },
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
