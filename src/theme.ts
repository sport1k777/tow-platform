export const colors = {
  background: '#080B0F',
  surface: '#11161D',
  elevated: '#171D26',
  card: '#121820',
  text: '#F5F7FA',
  secondary: '#8D99A8',
  muted: '#687483',
  accent: '#FF9D00',
  accentSoft: '#FFB52E',
  accentWash: 'rgba(255, 157, 0, 0.16)',
  success: '#35C759',
  error: '#FF453A',
  warning: '#FFCC00',
  border: '#242C36',
  overlay: 'rgba(8, 11, 15, 0.72)',
  online: '#35C759',
  offline: '#687483',
  navy: '#171D26',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
  massive: 64,
} as const;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const type = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.7 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const, letterSpacing: -0.4 },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const, letterSpacing: -0.3 },
  section: { fontSize: 13, lineHeight: 18, fontWeight: '600' as const, letterSpacing: 0.8 },
  card: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
  small: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  status: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 0.6 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glow: {
    shadowColor: '#FF9D00',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
} as const;

export const motion = {
  fast: 160,
  base: 240,
  slow: 320,
} as const;
