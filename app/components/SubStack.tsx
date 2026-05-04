import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { SubId } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META, SUB_META } from '@/theme/dimensions';

interface Props {
  subIds: SubId[];
  /** How many circles to render before collapsing the rest into a +N chip. */
  max?: number;
  /** Diameter of each circle. Sub icon scales to ~55% of this. */
  size?: number;
}

/**
 * Overlapping circles of sub icons — used on task cards (and elsewhere) to
 * show every sub a task touches at a glance. Each circle is tinted with
 * its parent dim's halo + colored icon. When the list overflows `max`,
 * the remainder collapses into a single "+N" chip on the right.
 *
 * Today every task has exactly one sub_id (sub-first model), so the
 * common case is a single circle. SubStack ships ready for multi-sub if
 * the model expands later.
 */
export function SubStack({ subIds, max = 3, size = 22 }: Props) {
  if (subIds.length === 0) return null;
  const shown = subIds.slice(0, max);
  const extra = subIds.length - shown.length;
  const iconSize = Math.max(10, Math.round(size * 0.55));
  return (
    <View style={styles.row}>
      {shown.map((sid, i) => {
        const sub = SUB_META[sid];
        if (!sub) return null;
        const dim = DIMENSION_META[sub.dimensionId];
        return (
          <View
            key={sid}
            style={[
              styles.bubble,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: dim.bg,
                borderColor: dim.color + '55',
                marginLeft: i === 0 ? 0 : -6,
                zIndex: shown.length - i,
              },
            ]}
            accessibilityLabel={sub.label}
          >
            <Ionicons
              name={sub.iconName as never}
              size={iconSize}
              color={dim.color}
            />
          </View>
        );
      })}
      {extra > 0 && (
        <View
          style={[
            styles.extra,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -6,
            },
          ]}
        >
          <Text style={styles.extraText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  extra: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1.5,
    borderColor: tokens.border.strong,
  },
  extraText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    color: tokens.text.mid,
  },
});
