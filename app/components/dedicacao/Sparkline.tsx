import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { tokens } from '@/theme';

interface Props {
  /** Cumulative values over the window — must be non-decreasing. */
  cumulative: number[];
  color: string;
  width?: number;
  height?: number;
}

/**
 * Cumulative sparkline — small line chart with no axes/labels. Used inside
 * the per-dimension card on Dedicação to show how XP accumulated across the
 * selected window. Renders a faint baseline + the line at the dim's color.
 *
 * Empty/flat input (all zeros): renders just the baseline.
 */
export function Sparkline({ cumulative, color, width = 240, height = 36 }: Props) {
  const path = useMemo(() => {
    if (cumulative.length === 0) return null;
    const last = cumulative[cumulative.length - 1];
    if (last <= 0) return null;
    const max = last;
    const padY = 2;
    const usableH = height - padY * 2;
    const stepX =
      cumulative.length > 1 ? width / (cumulative.length - 1) : 0;
    let d = '';
    cumulative.forEach((v, i) => {
      const x = i * stepX;
      const y = height - padY - (v / max) * usableH;
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    return d;
  }, [cumulative, width, height]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke={tokens.border.base}
          strokeWidth={1}
        />
        {path && (
          <Path
            d={path}
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
}
