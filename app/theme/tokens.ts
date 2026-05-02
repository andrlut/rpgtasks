/**
 * Design tokens — ported from design/tokens.css.
 * Single source of truth for the React Native UI.
 *
 * Keep in sync with design/tokens.css if either side changes.
 */

export const tokens = {
  bg: {
    deep: '#0A0E26',
    base: '#0E1230',
    surface: '#1A1F44',
    surface2: '#232958',
    surface3: '#2D3470',
    glass: 'rgba(36, 42, 88, 0.55)',
    glassStrong: 'rgba(36, 42, 88, 0.78)',
  },
  text: {
    hi: '#F2F3FF',
    base: '#D9DBFA',
    mid: '#9AA0D4',
    dim: '#6E74A8',
    faint: '#4A4F7A',
  },
  border: {
    base: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.14)',
    divider: 'rgba(255, 255, 255, 0.06)',
  },
  brand: {
    violet: '#7B5CFF',
    violet2: '#9B82FF',
    violetDeep: '#4B2FCC',
    violetGlow: 'rgba(123, 92, 255, 0.45)',
  },
  semantic: {
    xp: '#3DD68C',
    xp2: '#6FE8AA',
    xpGlow: 'rgba(61, 214, 140, 0.4)',
    coin: '#FFC83D',
    coin2: '#FFE08A',
    coinDeep: '#C8881C',
    coinGlow: 'rgba(255, 200, 61, 0.55)',
    danger: '#FF5C7A',
    warn: '#FF9F43',
  },
  dimension: {
    health: '#FF6B7A',
    strength: '#FF8A3D',
    mind: '#B07BFF',
    wealth: '#FFC83D',
    social: '#4DD0FF',
    discipline: '#2EC4B6',
  },
  dimensionBg: {
    health: 'rgba(255, 107, 122, 0.16)',
    strength: 'rgba(255, 138, 61, 0.16)',
    mind: 'rgba(176, 123, 255, 0.18)',
    wealth: 'rgba(255, 200, 61, 0.16)',
    social: 'rgba(77, 208, 255, 0.16)',
    discipline: 'rgba(46, 196, 182, 0.16)',
  },
  tier: {
    beginner: '#8E94C4',
    bronze1: '#E69559',
    bronze2: '#8C4B22',
    silver1: '#E8ECFF',
    silver2: '#7B85B8',
    gold1: '#FFE08A',
    gold2: '#C8881C',
    master1: '#C2A1FF',
    master2: '#4DD0FF',
    master3: '#FFC83D',
  },
  radius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
    pill: 999,
  },
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 32,
    8: 40,
    9: 48,
    10: 64,
  },
  layout: {
    /**
     * Bottom padding tab screens must reserve so the floating glass nav bar
     * (BottomNavBar) doesn't cover the last items when scrolled to the end.
     * Bar is 64h + 12 bottom margin + ~min safe-area padding.
     */
    bottomNavClearance: 100,
  },
  font: {
    family: 'Manrope_500Medium',
    familyBold: 'Manrope_700Bold',
    familyHeavy: 'Manrope_800ExtraBold',
  },
  type: {
    display: { fontFamily: 'Manrope_800ExtraBold', fontSize: 36, lineHeight: 38 },
    h1: { fontFamily: 'Manrope_800ExtraBold', fontSize: 28, lineHeight: 31 },
    h2: { fontFamily: 'Manrope_700Bold', fontSize: 22, lineHeight: 26 },
    h3: { fontFamily: 'Manrope_700Bold', fontSize: 17, lineHeight: 21 },
    body: { fontFamily: 'Manrope_500Medium', fontSize: 14, lineHeight: 20 },
    bodyLg: { fontFamily: 'Manrope_500Medium', fontSize: 16, lineHeight: 23 },
    caption: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, lineHeight: 16 },
    eyebrow: { fontFamily: 'Manrope_700Bold', fontSize: 11, lineHeight: 13 },
    numXl: { fontFamily: 'Manrope_800ExtraBold', fontSize: 56, lineHeight: 56 },
    numLg: { fontFamily: 'Manrope_800ExtraBold', fontSize: 32, lineHeight: 32 },
    numMd: { fontFamily: 'Manrope_700Bold', fontSize: 20, lineHeight: 20 },
  },
  motion: {
    durFast: 140,
    dur: 240,
    durSlow: 480,
  },
} as const;

export type Tokens = typeof tokens;
export type DimensionId = keyof typeof tokens.dimension;
