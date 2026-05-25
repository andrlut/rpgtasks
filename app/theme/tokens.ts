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
    /** Perceva pale-gold — eyebrows, reward names, accent labels. */
    coinLight: '#FFE3A6',
    /** Card rim accent for gold-bordered surfaces (reward/quest chips). */
    coinRim: 'rgba(255, 200, 61, 0.45)',
    danger: '#FF5C7A',
    warn: '#FF9F43',
  },
  dimension: {
    health: '#FF6B7A',
    body: '#FF8A3D',
    mind: '#B07BFF',
    wealth: '#FFC83D',
    bonds: '#4DD0FF',
    craft: '#2EC4B6',
  },
  dimensionBg: {
    health: 'rgba(255, 107, 122, 0.16)',
    body: 'rgba(255, 138, 61, 0.16)',
    mind: 'rgba(176, 123, 255, 0.18)',
    wealth: 'rgba(255, 200, 61, 0.16)',
    bonds: 'rgba(77, 208, 255, 0.16)',
    craft: 'rgba(46, 196, 182, 0.16)',
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
     * Static fallback for contexts where hooks don't run (StyleSheet.create).
     * Tab-screen ScrollViews should prefer `useBottomNavClearance()` from
     * `@/components/BottomNavBar` — it respects the device gesture bar.
     *
     * Bar 64h + 12 bottom margin + 8 minimum safe-area = 84px.
     */
    bottomNavClearance: 84,
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
    /**
     * Reanimated `withSpring` config presets. Apply by spreading:
     *   withSpring(target, tokens.motion.springSnappy)
     */
    springSnappy: { damping: 18, stiffness: 220, mass: 1 },
    springBouncy: { damping: 12, stiffness: 180, mass: 1 },
    springSlow: { damping: 22, stiffness: 120, mass: 1 },
  },
  /**
   * Pre-baked elevation/glow shadow recipes. Spread into a style object —
   *   ...tokens.shadow.violetGlow
   *
   * Each entry sets `shadow*` (iOS), `elevation` (Android), AND `boxShadow`
   * (web + RN 0.79+ universal). RN-Web 0.21 deprecated the `shadow*` props
   * and was misrendering them as inset/inner glows; the `boxShadow` value
   * is what actually drives the visible drop-shadow on web.
   */
  shadow: {
    violetGlow: {
      shadowColor: '#7B5CFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 14,
      elevation: 10,
      boxShadow: '0px 8px 18px rgba(123, 92, 255, 0.55)',
    },
    violetGlowSoft: {
      shadowColor: '#7B5CFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 5,
      boxShadow: '0px 4px 12px rgba(123, 92, 255, 0.35)',
    },
    coinGlow: {
      shadowColor: '#FFC83D',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 8,
      boxShadow: '0px 6px 16px rgba(255, 200, 61, 0.5)',
    },
    coinGlowSoft: {
      shadowColor: '#FFC83D',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
      boxShadow: '0px 3px 10px rgba(255, 200, 61, 0.3)',
    },
    xpGlow: {
      shadowColor: '#3DD68C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 6,
      boxShadow: '0px 4px 14px rgba(61, 214, 140, 0.45)',
    },
    deep: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
      elevation: 12,
      boxShadow: '0px 10px 28px rgba(0, 0, 0, 0.45)',
    },
  },
  /**
   * Color tuples for `expo-linear-gradient`. Spread into the `colors` prop:
   *   <LinearGradient colors={tokens.gradient.heroCard} ... />
   * `Locations` arrays are exported alongside when a non-uniform stop matters.
   */
  gradient: {
    /**
     * Ambient screen background — fakes a top-anchored radial gradient using a
     * vertical linear gradient. Produces the "atmospheric" feel of the design
     * mocks without needing a true radial. Apply by spreading into a full-bleed
     * <LinearGradient> behind screen content.
     */
    screenAmbient: ['#1E2348', '#0E1230', '#0A0E26'] as const,
    screenAmbientLocations: [0, 0.5, 1] as const,
    heroCard: ['rgba(123, 92, 255, 0.18)', 'rgba(36, 42, 88, 0.6)'] as const,
    heroCardLocations: [0, 1] as const,
    coinPill: ['#FFE08A', '#FFC83D', '#C8881C'] as const,
    coinPillLocations: [0, 0.5, 1] as const,
    completeBtn: ['#9B82FF', '#5B3CE0'] as const,
    completeBtnLocations: [0, 1] as const,
    coinBtn: ['#FFE08A', '#FFC83D', '#C8881C'] as const,
    coinBtnLocations: [0, 0.5, 1] as const,
    questBoard: ['rgba(155, 130, 255, 0.18)', 'rgba(77, 208, 255, 0.08)'] as const,
    questBoardLocations: [0, 1] as const,
    /**
     * V3 "Today hub" gradients — applied to stats cards, task cards and
     * the activity bar. All share the same dark-violet → near-black
     * direction so the screen reads as one continuous surface tinted by
     * the violet halo backdrop.
     */
    todayHero: ['rgba(36, 42, 88, 0.85)', 'rgba(20, 24, 60, 0.95)'] as const,
    todayHeroLocations: [0, 1] as const,
    taskCard: ['rgba(36, 42, 88, 0.6)', 'rgba(20, 24, 60, 0.85)'] as const,
    taskCardLocations: [0, 1] as const,
    activityBar: ['rgba(36, 42, 88, 0.4)', 'rgba(20, 24, 60, 0.6)'] as const,
    activityBarLocations: [0, 1] as const,
    summaryChipViolet: [
      'rgba(155, 130, 255, 0.28)',
      'rgba(123, 92, 255, 0.16)',
    ] as const,
    summaryChipGreen: [
      'rgba(61, 214, 140, 0.32)',
      'rgba(61, 214, 140, 0.14)',
    ] as const,
    questChipGold: [
      'rgba(255, 224, 138, 0.22)',
      'rgba(255, 200, 61, 0.08)',
    ] as const,
    questChipViolet: [
      'rgba(155, 130, 255, 0.18)',
      'rgba(123, 92, 255, 0.06)',
    ] as const,
    /** Reward progress bar fill with a shimmer end → mid → start. */
    rewardBarFill: ['#C8881C', '#FFC83D', '#FFE3A6'] as const,
    rewardBarFillLocations: [0, 0.5, 1] as const,
    /** Violet task check button — top-light → mid-violet → deep. */
    taskCheckBtn: ['#9B82FF', '#7B5CFF', '#4B2FCC'] as const,
    taskCheckBtnLocations: [0, 0.6, 1] as const,
  },
} as const;

export type Tokens = typeof tokens;
export type DimensionId = keyof typeof tokens.dimension;
