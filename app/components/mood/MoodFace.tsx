import Svg, { Circle, Path } from 'react-native-svg';

import { moodLevel, type MoodValue } from '@/lib/mood';
import { tokens } from '@/theme';

/**
 * Hand-drawn 5-level mood faces (Apple State-of-Mind style) replacing the
 * emoji of the first journal iteration. Two problems this solves at once:
 *
 * 1. Emoji faces are themselves yellow (~#FCC21B–#FFD983) and vanish on the
 *    top three fills of the blue→gold ramp (1.06–1.65 contrast) — which is why
 *    every earlier surface had to render the level color as a ring and keep
 *    the emoji on a dark disc. These faces draw their features in the level's
 *    measured `ink` (≥4.5 on its own fill, see lib/mood.ts), so the disc can
 *    finally BE the level color.
 * 2. Emoji render differently per vendor; these are identical everywhere.
 *
 * Geometry lives in a 48×48 viewBox and scales via `size`.
 */

interface FaceSpec {
  /** Mouth path (stroke, round caps). */
  mouth: string;
  /** Round eyes at y≈19.5 — omitted on level 5 (happy squint arcs). */
  dotEyes: boolean;
  /** Extra stroked paths: sad brows (level 1), squint arcs (level 5). */
  extras: string[];
}

const FACE_SPECS: Record<MoodValue, FaceSpec> = {
  1: {
    mouth: 'M15.5 33.5 Q24 26 32.5 33.5',
    dotEyes: true,
    // Sad brows — inner ends raised.
    extras: ['M13 16 L19.3 14', 'M35 16 L28.7 14'],
  },
  2: { mouth: 'M16.5 32.5 Q24 28 31.5 32.5', dotEyes: true, extras: [] },
  3: { mouth: 'M17 31 L31 31', dotEyes: true, extras: [] },
  4: { mouth: 'M16.5 28.5 Q24 34.5 31.5 28.5', dotEyes: true, extras: [] },
  5: {
    mouth: 'M15 27.5 Q24 37.5 33 27.5',
    dotEyes: false,
    // Happy squint — eyes as upward arcs.
    extras: ['M13.5 20 Q17 16 20.5 20', 'M27.5 20 Q31 16 34.5 20'],
  },
};

interface Props {
  value: MoodValue;
  /** Rendered square size in px. Default 48 (the viewBox unit). */
  size?: number;
  /**
   * Active: disc filled with the level color, features in its `ink`.
   * Inactive: translucent disc, level-colored ring, neutral features.
   */
  active?: boolean;
}

export function MoodFace({ value, size = 48, active = false }: Props) {
  const level = moodLevel(value);
  const spec = FACE_SPECS[value];
  const stroke = active ? level.ink : tokens.text.mid;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle
        cx={24}
        cy={24}
        r={21}
        fill={active ? level.color : 'rgba(255,255,255,0.03)'}
        stroke={active ? level.color : `${level.color}99`}
        strokeWidth={2}
      />
      {spec.dotEyes && (
        <>
          <Circle cx={17} cy={19.5} r={2.5} fill={stroke} />
          <Circle cx={31} cy={19.5} r={2.5} fill={stroke} />
        </>
      )}
      {[spec.mouth, ...spec.extras].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={stroke}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

/**
 * "Nothing logged yet" slot — dashed ring with a ghost-neutral face. Used by
 * the check-in hero (before a rating is picked) and the unlogged today cards.
 */
export function MoodFacePlaceholder({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle
        cx={24}
        cy={24}
        r={21}
        fill="rgba(255,255,255,0.03)"
        stroke={tokens.border.strong}
        strokeWidth={2}
        strokeDasharray="4 5"
      />
      <Circle cx={17} cy={19.5} r={2.5} fill={tokens.text.faint} />
      <Circle cx={31} cy={19.5} r={2.5} fill={tokens.text.faint} />
      <Path
        d="M17 31 L31 31"
        stroke={tokens.text.faint}
        strokeWidth={2.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
