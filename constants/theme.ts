import { Platform } from 'react-native';

// ─── Primitive palette (design system ink/brass/slate/clay/moss ramps) ─────
export const Palette = {
  ink950: '#0E1828',
  ink900: '#14213A',
  ink800: '#1E2D4D',
  ink700: '#2A3F66',
  ink600: '#3F558C',
  ink300: '#B8C2D6',
  ink100: '#E8ECF4',
  ink50:  '#F4F6FB',

  brass900: '#6E5418',
  brass700: '#8C6A1F',
  brass500: '#B68A2E',
  brass400: '#C9A24E',
  brass200: '#E8D7A5',
  brass100: '#F4ECD2',
  brass50:  '#FBF7EA',

  parchment50:  '#FBFAF6',
  parchment100: '#F6F4EE',
  parchment200: '#ECE7D9',

  slate50:  '#F8FAFD',
  slate100: '#F2F5FA',
  slate200: '#E3E9F2',
  slate300: '#CBD3E0',
  slate500: '#6B7689',
  slate700: '#4A5468',
  slate900: '#1F2A44',

  clay700: '#7A2E2E',
  clay500: '#9B4848',
  clay100: '#F1DFDB',
  clay50:  '#F9EFEC',

  moss700: '#3F5A3A',
  moss500: '#5C7A56',
  moss100: '#E2EAD9',

  white: '#FFFFFF',
};

// ─── Semantic color map ──────────────────────────────────────────────────────
export const C = {
  // Surfaces
  bg:           Palette.slate50,
  bgWarm:       Palette.parchment50,
  surface:      Palette.white,
  surfaceAlt:   Palette.slate100,
  surfaceBrass: Palette.brass50,

  // Brand
  primary:      Palette.ink900,
  primarySoft:  Palette.ink100,
  secondary:    Palette.ink700,
  secondarySoft:Palette.ink100,

  // Accent (brass / gold)
  accent:       Palette.brass500,
  accentStrong: Palette.brass700,
  accentSoft:   Palette.brass100,

  // States
  success:      Palette.moss700,
  successSoft:  Palette.moss100,
  warning:      Palette.brass700,
  warningSoft:  Palette.brass100,
  danger:       Palette.clay700,
  dangerSoft:   Palette.clay50,

  // Text
  textPrimary:   Palette.ink900,
  textStrong:    Palette.ink950,
  textSecondary: Palette.slate700,
  textMuted:     Palette.slate500,
  textInverse:   Palette.white,

  // Borders
  border:        Palette.slate200,
  borderStrong:  Palette.slate300,
  borderSoft:    '#EEF2F7',
  borderBrass:   Palette.brass200,
};

export const Colors = {
  light: {
    text:            C.textPrimary,
    background:      C.bg,
    tint:            C.secondary,
    icon:            C.textSecondary,
    tabIconDefault:  C.textSecondary,
    tabIconSelected: C.secondary,
  },
  dark: {
    text:            C.textPrimary,
    background:      C.bg,
    tint:            C.secondary,
    icon:            C.textSecondary,
    tabIconDefault:  C.textSecondary,
    tabIconSelected: C.secondary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'SourceSans3-Regular',
    sansSemiBold: 'SourceSans3-Semibold',
    sansBold: 'SourceSans3-Bold',
    display: 'CormorantGaramond-Regular',
    displaySemiBold: 'CormorantGaramond-SemiBold',
    displayBold: 'CormorantGaramond-Bold',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'SourceSans3-Regular',
    sansSemiBold: 'SourceSans3-Semibold',
    sansBold: 'SourceSans3-Bold',
    display: 'CormorantGaramond-Regular',
    displaySemiBold: 'CormorantGaramond-SemiBold',
    displayBold: 'CormorantGaramond-Bold',
    mono: 'monospace',
  },
  web: {
    sans: "'SourceSans3-Regular', 'Segoe UI', sans-serif",
    sansSemiBold: "'SourceSans3-Semibold', 'Segoe UI', sans-serif",
    sansBold: "'SourceSans3-Bold', 'Segoe UI', sans-serif",
    display: "'CormorantGaramond-Regular', Georgia, serif",
    displaySemiBold: "'CormorantGaramond-SemiBold', Georgia, serif",
    displayBold: "'CormorantGaramond-Bold', Georgia, serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
