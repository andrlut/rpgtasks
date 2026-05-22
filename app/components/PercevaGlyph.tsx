import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

/**
 * Perceva brand glyph — "Topo Iris".
 *
 * Concentric topographic rings that read as an iris when zoomed out, with a
 * gold path line cutting diagonally through. Used for:
 *   - The app icon (bare=false, palette='gilded')
 *   - The coin center (via <PercevaGlyphContent/> inlined into the coin Svg)
 *   - Faint engraved backdrops on Vault cards (bare=true at low opacity)
 *
 * All paths sit in a 1024-unit viewBox. The two surfaces:
 *
 *   <PercevaGlyph .../>           — full standalone component, owns its own
 *                                   <Svg> wrapper. Use anywhere you'd render
 *                                   a normal image.
 *
 *   <PercevaGlyphContent .../>    — same paths, no wrapper. Use when the
 *                                   glyph needs to live INSIDE another
 *                                   <Svg> (e.g. engraved in the coin center).
 *                                   Caller is responsible for sizing the
 *                                   parent Svg viewBox to 1024 — or
 *                                   wrapping in a translate/scale G.
 */

export type PercevaPaletteName =
  | 'primary'
  | 'midnight'
  | 'gilded'
  | 'arcane';

export interface PercevaPalette {
  /** Background tile gradient top color (only used when bare=false). */
  bgA: string;
  /** Background tile gradient bottom color. */
  bgB: string;
  /** Primary mark color — the gold path + endpoint dots + pupil center. */
  mark: string;
  /** Deep mark color — pupil rim, engraved shadow layer. */
  markDeep: string;
  /** Secondary accent — the concentric ring strokes. */
  accent: string;
  /** Deep accent — currently unused by Topo Iris but exposed for parity. */
  accentDeep: string;
}

const PALETTES: Record<PercevaPaletteName, PercevaPalette> = {
  primary: {
    bgA: '#1A1F44',
    bgB: '#3F2B8F',
    mark: '#FFE3A6',
    markDeep: '#C8881C',
    accent: '#9B82FF',
    accentDeep: '#5B3CE0',
  },
  midnight: {
    bgA: '#0A0E26',
    bgB: '#1F1655',
    mark: '#FFE3A6',
    markDeep: '#A77416',
    accent: '#7B5CFF',
    accentDeep: '#4B2FCC',
  },
  gilded: {
    bgA: '#1F1655',
    bgB: '#4B2FCC',
    mark: '#FFDC8F',
    markDeep: '#8A5C0F',
    accent: '#FFE3A6',
    accentDeep: '#C8881C',
  },
  arcane: {
    bgA: '#0E1230',
    bgB: '#5B3CE0',
    mark: '#C2A1FF',
    markDeep: '#4B2FCC',
    accent: '#FFE3A6',
    accentDeep: '#A77416',
  },
};

const PATH_D = 'M 180 720 Q 380 600 512 512 Q 644 424 844 304';

/**
 * Wrapperless glyph content. Renders inside a caller-owned <Svg>.
 *
 * NOTE: defs (gradients, mask) live alongside the paths because
 * react-native-svg doesn't lift them across Svg boundaries.
 */
interface ContentProps {
  palette?: PercevaPaletteName;
  colors?: Partial<PercevaPalette>;
  /** Unique per-render id used to namespace gradients and masks. */
  idSuffix: string;
  /** Include the squircle tile background (gradient + glow + inner border). */
  withTile?: boolean;
}

export function PercevaGlyphContent({
  palette = 'primary',
  colors,
  idSuffix,
  withTile = false,
}: ContentProps) {
  const p: PercevaPalette = { ...PALETTES[palette], ...colors };
  const pupilId = `pg-pupil-${idSuffix}`;
  const bgId = `pg-bg-${idSuffix}`;
  const glowId = `pg-glow-${idSuffix}`;

  // No <Mask> — react-native-svg has historically crashed on Android when
  // <Mask> elements are present. The gold path is drawn last and visually
  // covers the ring crossings well enough in the canonical use cases
  // (engraved on cards at 7-9% opacity, or rendered as the app icon
  // where the carving was a nicety, not a load-bearing detail).
  return (
    <>
      <Defs>
        <RadialGradient id={pupilId} cx="0.4" cy="0.4" r="0.7">
          <Stop offset="0" stopColor={p.mark} />
          <Stop offset="1" stopColor={p.markDeep} />
        </RadialGradient>
        {withTile && (
          <>
            <LinearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={p.bgA} />
              <Stop offset="1" stopColor={p.bgB} />
            </LinearGradient>
            <RadialGradient id={glowId} cx="0.5" cy="0.35" r="0.7">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </>
        )}
      </Defs>

      {withTile && (
        <>
          <Rect
            x="0"
            y="0"
            width="1024"
            height="1024"
            rx={1024 * 0.225}
            fill={`url(#${bgId})`}
          />
          <Rect
            x="0"
            y="0"
            width="1024"
            height="1024"
            rx={1024 * 0.225}
            fill={`url(#${glowId})`}
          />
          <Rect
            x="3"
            y="3"
            width="1018"
            height="1018"
            rx={1024 * 0.225 - 3}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
          />
        </>
      )}

      <G stroke={p.accent} fill="none" strokeWidth="14">
        <Circle cx="512" cy="512" r="320" opacity={0.45} />
        <Circle cx="512" cy="512" r="260" opacity={0.55} />
        <Circle cx="512" cy="512" r="200" opacity={0.7} />
        <Circle cx="512" cy="512" r="140" opacity={0.85} />
        <Circle cx="512" cy="512" r="80" opacity={1} />
      </G>

      <Path
        d={PATH_D}
        fill="none"
        stroke={p.mark}
        strokeWidth="22"
        strokeLinecap="round"
      />
      <Circle cx="180" cy="720" r="18" fill={p.mark} />
      <Circle cx="844" cy="304" r="22" fill={p.mark} />
      <Circle cx="512" cy="512" r="38" fill={`url(#${pupilId})`} />
    </>
  );
}

interface Props {
  size: number;
  /** Glyph only, no squircle tile. Defaults to true. */
  bare?: boolean;
  palette?: PercevaPaletteName;
  /** Override individual palette channels — useful for the engraved coin
   *  treatment where the glyph re-skins to match coin metals. */
  colors?: Partial<PercevaPalette>;
  /** Optional id suffix used to namespace internal gradient/mask defs.
   *  Required when more than one PercevaGlyph renders on the same screen. */
  idSuffix?: string;
}

/**
 * Standalone PercevaGlyph — owns its own <Svg>. Use this anywhere except
 * when embedding inside another SVG (then use <PercevaGlyphContent/>).
 */
export function PercevaGlyph({
  size,
  bare = true,
  palette = 'primary',
  colors,
  idSuffix = 'default',
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <PercevaGlyphContent
        palette={palette}
        colors={colors}
        idSuffix={idSuffix}
        withTile={!bare}
      />
    </Svg>
  );
}
