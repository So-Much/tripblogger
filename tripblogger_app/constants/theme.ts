/**
 * TripBlogger — travel marketplace theme (modern blue, friendly, minimal friction).
 */

import { Platform } from 'react-native';

const ctaLight = '#0284C7';
const ctaDark = '#38BDF8';

export const Colors = {
  light: {
    text: '#0F172A',
    textMuted: '#64748B',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E2E8F0',
    primary: '#E0F2FE',
    secondary: '#DBEAFE',
    tint: ctaLight,
    accent: '#0EA5E9',
    cta: ctaLight,
    onCta: '#FFFFFF',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: ctaLight,
  },
  dark: {
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    card: '#1E293B',
    border: '#334155',
    primary: '#0C4A6E',
    secondary: '#1E3A5F',
    tint: ctaDark,
    accent: ctaDark,
    cta: ctaDark,
    onCta: '#0F172A',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: ctaDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'NotoSerifDisplay_400Regular',
    display: 'NotoSerifDisplay_600SemiBold',
    rounded: 'ui-rounded',
    mono: 'SpaceMono_400Regular',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    display: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "'Noto Serif Display', Georgia, 'Times New Roman', serif",
    display: "'Noto Serif Display', Georgia, serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "'Space Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
