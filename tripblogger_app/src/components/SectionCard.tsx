import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export function SectionCard({ children }: PropsWithChildren) {
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'card');

  return <View style={[styles.card, { borderColor, backgroundColor }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
});
