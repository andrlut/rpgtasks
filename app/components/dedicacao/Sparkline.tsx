import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
} from 'react-native-svg';

import { tokens } from '@/theme';

interface Props {
  /** Cumulative values over the window — must be non-decreasing. */
  cumulative: number[];
  color: string;
  /** Y-axis ceiling. When provided, the line is drawn relative to this max
   *  instead of the series' own peak — so multiple sparklines on screen can
   *  be visually compared. Falls back to the series' last value. */
  globalMax?: number;
  width?: number;
  height?: number;
  /** Stable id for the gradient def — required when multiple sparklines render
   *  on the same screen (SVG defs share a flat namespace). */
  idSuffix: string;
}

/**
 * Cumulative sparkline — small line chart with no axes/labels. Used inside
 * the per-dimension card on Dedicação to show how XP accumulated across the
 * selected window. Renders a faint baseline + a colored line + a soft area
 * fill under the curve.
 *
 * When `globalMax` is set, the y-axis is fixed at that ceiling so all dims
 * are directly comparable — a sub-leading dim renders short and flat next
 * to the leader's full-height climb.
 */
export function Sparkline({
  cumulative,
  color,
  globalMax,
  width = 240,
  height = 36,
  idSuffix,
}: Props) {
  const { linePath, areaPath } = useMemo(() => {
    if (cumulative.length === 0) return { linePath: null, areaPath: null };
    const last = cumulative[cumulative.length - 1];
    if (last <= 0) return { linePath: null, areaPath: null };
    const max = globalMax && globalMax > 0 ? globalMax : last;
    const padY = 2;
    const usableH = height - padY * 2;
    const stepX =
      cumulative.length > 1 ? width / (cumulative.length - 1) : 0;
    let line = '';
    cumulative.forEach((v, i) => {
      const x = i * stepX;
      const y = height - padY - (Math.min(v, max) / max) * usableH;
      line += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    // Close the area down to the baseline at both ends.
    const area = `${line} L ${(cumulative.length - 1) * stepX} ${height - padY} L 0 ${
      height - padY
    } Z`;
    return { linePath: line, areaPath: area };
  }, [cumulative, width, height, globalMax]);

  const gradId = `spark-${idSuffix}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.32} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke={tokens.border.base}
          strokeWidth={1}
        />
        {areaPath && <Path d={areaPath} fill={`url(#${gradId})`} stroke="none" />}
        {linePath && (
          <Path
            d={linePath}
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
