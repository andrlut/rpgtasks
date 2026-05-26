import { Ionicons } from '@expo/vector-icons';
import { useMemo, type MutableRefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  dayKey,
  type CompletionEntry,
} from '@/lib/api/dedicacaoHistory';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import { DIMENSION_META, SUB_META } from '@/theme/dimensions';

interface Props {
  entries: CompletionEntry[];
  /** Optional ref map populated as day headers render. The parent screen
   *  uses measureLayout against its ScrollView ref to scroll-to-day from
   *  heatmap taps. Keys are 'YYYY-MM-DD'. */
  dayHeaderRefs?: MutableRefObject<Map<string, View | null>>;
}

interface DayGroup {
  key: string;
  date: Date;
  totalXp: number;
  entries: CompletionEntry[];
}

function formatDayLabel(date: Date, locale: 'pt' | 'en'): string {
  const loc = locale === 'pt' ? 'pt-BR' : 'en-US';
  // "qui, 23 mai" / "Thu, May 23"
  return new Intl.DateTimeFormat(loc, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace('.', '');
}

function formatTime(date: Date, locale: 'pt' | 'en'): string {
  const loc = locale === 'pt' ? 'pt-BR' : 'en-US';
  return new Intl.DateTimeFormat(loc, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Day-grouped chronological log of XP completions. Each group has a header
 * with the date + total XP for that day; each entry shows the task title,
 * total XP (colored by the dominant dim), the time-of-day, and sub chips
 * for the breakdown.
 *
 * Pure render — does no filtering. Parent feeds already-filtered entries.
 */
export function CompletionLog({ entries, dayHeaderRefs }: Props) {
  const { locale } = useT();
  const metaLookup = useMetaLookup();

  const groups: DayGroup[] = useMemo(() => {
    const map = new Map<string, DayGroup>();
    for (const e of entries) {
      const k = dayKey(e.completedAt);
      const existing = map.get(k);
      if (existing) {
        existing.entries.push(e);
        existing.totalXp += e.totalXp;
      } else {
        map.set(k, {
          key: k,
          date: e.completedAt,
          totalXp: e.totalXp,
          entries: [e],
        });
      }
    }
    // Iteration order matches entries' order (newest first).
    return [...map.values()];
  }, [entries]);

  if (entries.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons
          name="search-outline"
          size={28}
          color={tokens.text.dim}
        />
        <Text style={styles.emptyTitle}>
          {locale === 'pt'
            ? 'Nada bateu nos filtros'
            : 'Nothing matched these filters'}
        </Text>
        <Text style={styles.emptyHint}>
          {locale === 'pt'
            ? 'Tente ampliar o período ou tirar alguma dim/sub.'
            : 'Try widening the period or removing a dim/sub.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <View
            ref={(node) => {
              if (dayHeaderRefs) dayHeaderRefs.current.set(group.key, node);
            }}
            style={styles.dayHeader}
          >
            <Text style={styles.dayLabel}>
              {formatDayLabel(group.date, locale).toUpperCase()}
            </Text>
            <View style={styles.dayDivider} />
            <Text style={styles.dayXp}>
              +{group.totalXp.toLocaleString()} XP
            </Text>
          </View>

          {group.entries.map((entry) => {
            const dim = entry.dominantDimId
              ? DIMENSION_META[entry.dominantDimId]
              : null;
            const accent = dim?.color ?? tokens.brand.violet2;
            const tint = dim?.bg ?? 'rgba(155,130,255,0.10)';
            return (
              <View
                key={entry.id}
                style={[
                  styles.entry,
                  { borderLeftColor: accent, backgroundColor: tint },
                ]}
              >
                <View style={styles.entryTop}>
                  <Text style={styles.entryTitle} numberOfLines={2}>
                    {entry.taskTitle}
                  </Text>
                  <Text style={[styles.entryXp, { color: accent }]}>
                    +{entry.totalXp.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.entryMeta}>
                  <Text style={styles.entryTime}>
                    {formatTime(entry.completedAt, locale)}
                  </Text>
                  <View style={styles.subChipRow}>
                    {entry.subs.map((sub) => {
                      const subMeta = SUB_META[sub.subId];
                      const subDim = DIMENSION_META[subMeta.dimensionId];
                      return (
                        <View
                          key={sub.subId}
                          style={[
                            styles.subChip,
                            { borderColor: `${subDim.color}55` },
                          ]}
                        >
                          <Ionicons
                            name={subMeta.iconName as never}
                            size={10}
                            color={subDim.color}
                          />
                          <Text
                            style={[styles.subChipLabel, { color: subDim.color }]}
                          >
                            {metaLookup.sub(sub.subId).label}
                          </Text>
                          <Text style={styles.subChipXp}>
                            +{sub.xp.toLocaleString()}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space[3],
  },
  group: {
    gap: tokens.space[2],
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingVertical: 4,
  },
  dayLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: tokens.text.mid,
  },
  dayDivider: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.border.divider,
  },
  dayXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
  entry: {
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderLeftWidth: 3,
    gap: 6,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[2],
  },
  entryTitle: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
    lineHeight: 18,
  },
  entryXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  entryTime: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
  subChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  subChipLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  subChipXp: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.text.hi,
    letterSpacing: 0.2,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: tokens.space[5],
  },
  emptyTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.base,
  },
  emptyHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.dim,
    textAlign: 'center',
  },
});
