import { FriendlyRadius, FriendlySpace } from '@/constants/friendly-commerce';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useCommerceTheme() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return {
    scheme,
    primary: c.primary,
    secondary: c.secondary,
    background: c.background,
    surface: c.surface,
    card: c.card,
    border: c.border,
    text: c.text,
    textMuted: c.textMuted,
    cta: c.cta,
    tint: c.tint,
    accent: c.accent,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
    onCta: c.onCta,
    radius: FriendlyRadius,
    space: FriendlySpace,
  };
}
