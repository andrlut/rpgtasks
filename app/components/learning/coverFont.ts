/**
 * Deterministic mapping from material slug to one of 4 display fonts.
 *
 * Goal: make the Learn feed feel like a shelf of varied book covers,
 * where each cover's title typography is its own thing. Same material
 * always renders with the same font (so users build recognition); the
 * choice is stable across re-renders/sessions.
 *
 * Picked for distinct "moods":
 *   - Playfair Display     — classic, contemplative serif
 *   - DM Serif Display     — modern editorial serif
 *   - Abril Fatface        — high-contrast statement serif
 *   - Bebas Neue           — bold condensed sans (athletic / blocky)
 */

const FONTS = [
  'PlayfairDisplay_700Bold',
  'DMSerifDisplay_400Regular',
  'AbrilFatface_400Regular',
  'BebasNeue_400Regular',
] as const;

export type CoverFont = (typeof FONTS)[number];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function coverFontForSlug(slug: string): CoverFont {
  return FONTS[hashCode(slug) % FONTS.length];
}

/**
 * Font-specific size and line-height tweaks so each display font reads
 * at roughly the same visual weight on the cover. Bebas Neue is very
 * tall and skinny so it can run bigger; Abril is heavy so it needs to
 * shrink slightly.
 */
export function coverFontSize(font: CoverFont): { fontSize: number; lineHeight: number } {
  switch (font) {
    case 'BebasNeue_400Regular':
      return { fontSize: 28, lineHeight: 30 };
    case 'AbrilFatface_400Regular':
      return { fontSize: 22, lineHeight: 26 };
    case 'DMSerifDisplay_400Regular':
      return { fontSize: 24, lineHeight: 28 };
    case 'PlayfairDisplay_700Bold':
    default:
      return { fontSize: 23, lineHeight: 27 };
  }
}
