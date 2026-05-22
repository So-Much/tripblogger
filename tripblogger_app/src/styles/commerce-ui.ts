import { StyleSheet } from 'react-native';
import { FriendlyRadius } from '@/constants/friendly-commerce';

/** Shared commerce CTA / chip metrics (Friendly compact density). */
export const commerceUi = StyleSheet.create({
  cta: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: FriendlyRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ctaText: {
    fontWeight: '700',
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: FriendlyRadius.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
});
