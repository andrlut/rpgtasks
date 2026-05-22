import { useId } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

/**
 * Perceva coin — Runic variant in the primary (gold + violet) palette.
 *
 * Pure react-native-svg. All <Defs> live at the very top of the <Svg>
 * because RN-svg on Android crashes natively when Defs/Mask elements are
 * nested inside a transformed <G>. The engraved Topo Iris glyph is inlined
 * here (rather than reused from PercevaGlyph) so its defs can stay at the
 * top alongside the coin's own gradients.
 *
 * Layered top-down:
 *   1. Violet outer rim peek
 *   2. Gold radial body
 *   3. Bottom shadow gradient (weight)
 *   4. Violet inner tinge (keeps the edge from feeling flat)
 *   5. Rim hairlines
 *   6. Inner runic ring — 12 rune marks (engrave shadow + bright stroke)
 *   7. Engraved Topo Iris glyph (rings + gold path + pupil)
 *   8. Top-left sheen (mostly transparent — approximates a screen blend)
 *
 * Keeps the original `size` API. Below ~16px the rune marks drop out.
 * No mask on the engraved glyph: the gold path is drawn last and visually
 * covers the ring crossings well enough at coin scale.
 */

interface Props {
  size?: number;
}

const RUNE_PATHS = [
  'M -10 -14 L 0 14 L 10 -14', // V
  'M -10 -14 L -10 14 M -10 0 L 10 0 M 10 -14 L 10 14', // H-bar
  'M -10 -14 L 0 0 L -10 14 M 0 0 L 10 0', // arrow-right
  'M -10 0 A 10 10 0 1 0 10 0', // arc
  'M 0 -14 L 0 14 M -10 -6 L 10 -6', // T
] as const;

const PALETTE = {
  bodyA: '#FFF1C7',
  bodyB: '#FFC97A',
  bodyC: '#B2761A',
  rim: '#7B5CFF',
  rimDeep: '#3F2B8F',
  glyph: '#FFE3A6',
  glyphDeep: '#8A5C0F',
  sheen: 'rgba(255,255,255,0.55)',
} as const;

function ringPoints(cx: number, cy: number, r: number, n: number, startDeg = -90) {
  const out: { x: number; y: number; deg: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((startDeg + (i / n) * 360) * Math.PI) / 180;
    out.push({
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
      deg: startDeg + (i / n) * 360,
    });
  }
  return out;
}

export function CoinIcon({ size = 14 }: Props) {
  // useId gives a stable per-instance id so multiple coins on the same
  // screen don't clobber each other's gradient defs.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bodyId = `cb-${id}`;
  const sheenId = `cs-${id}`;
  const shadowId = `csh-${id}`;
  const violetId = `cv-${id}`;
  const pupilId = `cp-${id}`;

  const marks = ringPoints(110, 110, 86, 12);
  const showRunes = size >= 16;

  // The engraved Topo Iris lives in a 108-unit area centered at (110, 110).
  // Internally its paths use a 1024 viewBox; we scale by 108/1024 ≈ 0.1055.
  const glyphScale = 108 / 1024;
  const glyphCx = 512;
  const glyphCy = 512;
  // Compute the translate so the glyph (in its 1024 space) lands centered
  // at (110, 110) in the coin's 220 viewBox after the scale.
  const glyphTx = 110 - glyphCx * glyphScale;
  const glyphTy = 110 - glyphCy * glyphScale;
  const PATH_D = 'M 180 720 Q 380 600 512 512 Q 644 424 844 304';

  return (
    <Svg width={size} height={size} viewBox="0 0 220 220">
      <Defs>
        <RadialGradient id={bodyId} cx="0.32" cy="0.28" r="0.85">
          <Stop offset="0" stopColor={PALETTE.bodyA} />
          <Stop offset="0.55" stopColor={PALETTE.bodyB} />
          <Stop offset="1" stopColor={PALETTE.bodyC} />
        </RadialGradient>
        <LinearGradient id={sheenId} x1="0.1" y1="0.1" x2="0.9" y2="0.9">
          <Stop offset="0" stopColor={PALETTE.sheen} stopOpacity={0.9} />
          <Stop offset="0.45" stopColor={PALETTE.sheen} stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={shadowId} cx="0.5" cy="0.95" r="0.6">
          <Stop offset="0" stopColor="#000" stopOpacity={0.45} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={violetId} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0.6" stopColor={PALETTE.rim} stopOpacity={0} />
          <Stop offset="1" stopColor={PALETTE.rim} stopOpacity={0.25} />
        </RadialGradient>
        <RadialGradient id={pupilId} cx="0.4" cy="0.4" r="0.7">
          <Stop offset="0" stopColor={PALETTE.glyph} />
          <Stop offset="1" stopColor={PALETTE.glyphDeep} />
        </RadialGradient>
      </Defs>

      {/* 1. Outer flat ring — the violet rim peeking out */}
      <Circle cx="110" cy="110" r="103" fill={PALETTE.rimDeep} opacity={0.4} />

      {/* 2. Main gold disc */}
      <Circle cx="110" cy="110" r="96" fill={`url(#${bodyId})`} />

      {/* 3. Bottom shadow for weight */}
      <Circle cx="110" cy="110" r="96" fill={`url(#${shadowId})`} />

      {/* 4. Violet inner tinge near the edge */}
      <Circle cx="110" cy="110" r="96" fill={`url(#${violetId})`} />

      {/* 5. Rim hairlines */}
      <Circle
        cx="110"
        cy="110"
        r="96"
        fill="none"
        stroke={PALETTE.rimDeep}
        strokeWidth="1.2"
        opacity={0.6}
      />
      <Circle
        cx="110"
        cy="110"
        r="92"
        fill="none"
        stroke={PALETTE.glyphDeep}
        strokeWidth="0.7"
        opacity={0.5}
      />

      {/* 6. Inner runic ring (only at larger sizes) */}
      {showRunes && (
        <G>
          <Circle
            cx="110"
            cy="110"
            r="76"
            fill="none"
            stroke={PALETTE.glyphDeep}
            strokeWidth="0.7"
            opacity={0.6}
          />
          {marks.map((m, i) => {
            const d = RUNE_PATHS[i % RUNE_PATHS.length];
            return (
              <G
                key={i}
                transform={`translate(${m.x}, ${m.y}) rotate(${m.deg + 90}) scale(0.45)`}
              >
                <Path
                  d={d}
                  fill="none"
                  stroke={PALETTE.glyphDeep}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
                <Path
                  d={d}
                  fill="none"
                  stroke={PALETTE.glyph}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.95}
                />
              </G>
            );
          })}
        </G>
      )}

      {/* 7. Engraved Topo Iris — rings + gold path + endpoints + pupil.
            No mask: at coin scale the gold path covers the ring crossings
            visually, and skipping the mask keeps all defs at the top of
            the Svg (RN-svg crashes natively on Android when masks or
            defs are nested inside a transformed group). */}
      <G transform={`translate(${glyphTx}, ${glyphTy}) scale(${glyphScale})`}>
        {/* Rings */}
        <G stroke={PALETTE.rim} fill="none" strokeWidth="14">
          <Circle cx="512" cy="512" r="320" opacity={0.45} />
          <Circle cx="512" cy="512" r="260" opacity={0.55} />
          <Circle cx="512" cy="512" r="200" opacity={0.7} />
          <Circle cx="512" cy="512" r="140" opacity={0.85} />
          <Circle cx="512" cy="512" r="80" opacity={1} />
        </G>
        {/* Gold path — drawn over the rings */}
        <Path
          d={PATH_D}
          fill="none"
          stroke={PALETTE.glyph}
          strokeWidth="22"
          strokeLinecap="round"
        />
        <Circle cx="180" cy="720" r="18" fill={PALETTE.glyph} />
        <Circle cx="844" cy="304" r="22" fill={PALETTE.glyph} />
        <Circle cx="512" cy="512" r="38" fill={`url(#${pupilId})`} />
      </G>

      {/* 8. Top-left sheen */}
      <Circle cx="110" cy="110" r="96" fill={`url(#${sheenId})`} />
    </Svg>
  );
}
