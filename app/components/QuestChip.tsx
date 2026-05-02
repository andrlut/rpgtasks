import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestWithProgress } from '@/lib/db/types';
import { tokens } from '@/theme';

import { ProgressBar } from './ProgressBar';

interface Props {
  quests: QuestWithProgress[] | undefined;
}

const MAX_QUESTS_SHOWN = 2;

function formatDeadline(deadlineIso: string): { text: string; urgent: boolean } {
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (ms < 0) {
    const dPast = Math.floor(-ms / 86400000);
    return { text: `Expired ${dPast}d ago`, urgent: true };
  }
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 2) return { text: `${days}d left`, urgent: false };
  if (days === 1) return { text: `1d left`, urgent: true };
  return { text: `${hours}h left`, urgent: true };
}

/**
 * Aggregate progress across a quest's requirements as a 0..1 fraction.
 * Equal-weights every requirement (good enough for a summary).
 */
function aggregateProgress(q: QuestWithProgress): number {
  if (q.requirements.length === 0) return 0;
  const fractions = q.requirements.map((rr) => {
    const target =
      rr.requirement.kind === 'reach_skill_value'
        ? Number(rr.requirement.min_value ?? 0)
        : Number(rr.requirement.target_count ?? 0);
    if (target <= 0) return rr.isMet ? 1 : 0;
    return Math.min(1, rr.currentCount / target);
  });
  return fractions.reduce((s, x) => s + x, 0) / fractions.length;
}

/**
 * Sort priority: ready-to-claim first, then most-urgent deadline.
 */
function sortQuests(quests: QuestWithProgress[]): QuestWithProgress[] {
  return [...quests].sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    return new Date(a.quest.deadline).getTime() - new Date(b.quest.deadline).getTime();
  });
}

export function QuestChip({ quests }: Props) {
  const router = useRouter();

  const active = (quests ?? []).filter((q) => q.quest.status === 'active');
  const ready = active.filter((q) => q.isComplete).length;
  const sorted = sortQuests(active);
  const visible = sorted.slice(0, MAX_QUESTS_SHOWN);
  const overflow = active.length - visible.length;

  const isEmpty = active.length === 0;
  const hasReady = ready > 0;

  return (
    <Pressable
      onPress={() => router.push('/quests')}
      style={({ pressed }) => [
        styles.card,
        hasReady && styles.cardReady,
        hasReady && tokens.shadow.coinGlowSoft,
        pressed && { opacity: 0.92 },
      ]}
    >
      {hasReady && (
        <LinearGradient
          colors={tokens.gradient.coinPill}
          locations={tokens.gradient.coinPillLocations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.passthrough, { opacity: 0.18 }]}
        />
      )}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, hasReady && styles.iconWrapReady]}>
            <Ionicons
              name="trophy"
              size={16}
              color={hasReady ? tokens.semantic.coin : tokens.brand.violet2}
            />
          </View>
          <Text style={styles.title}>
            {isEmpty
              ? 'No quests active'
              : hasReady
                ? `${ready} ready to claim`
                : `${active.length} active quest${active.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={tokens.text.mid} />
      </View>

      {isEmpty ? (
        <Text style={styles.emptySub}>Take one from the board to start grinding.</Text>
      ) : (
        <View style={styles.questList}>
          {visible.map((q) => {
            const progress = aggregateProgress(q);
            const deadline = formatDeadline(q.quest.deadline);
            return (
              <View key={q.quest.id} style={styles.questRow}>
                <View style={styles.questHeader}>
                  <Text style={styles.questTitle} numberOfLines={1}>
                    {q.quest.title}
                  </Text>
                  {q.isComplete ? (
                    <View style={styles.readyPill}>
                      <Ionicons name="checkmark" size={10} color={tokens.semantic.coin} />
                      <Text style={styles.readyText}>Ready</Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.deadlineText,
                        { color: deadline.urgent ? tokens.semantic.danger : tokens.text.mid },
                      ]}
                    >
                      {deadline.text}
                    </Text>
                  )}
                </View>
                <ProgressBar
                  value={progress * 100}
                  max={100}
                  color={q.isComplete ? tokens.semantic.coin : tokens.brand.violet}
                  height={4}
                />
              </View>
            );
          })}
          {overflow > 0 && (
            <Text style={styles.overflowText}>+{overflow} more</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[3],
    gap: tokens.space[3],
    overflow: 'hidden',
  },
  cardReady: {
    borderColor: 'rgba(255, 184, 70, 0.45)',
  },
  passthrough: {
    pointerEvents: 'none',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 92, 255, 0.18)',
  },
  iconWrapReady: {
    backgroundColor: 'rgba(255, 184, 70, 0.22)',
  },
  title: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_800ExtraBold',
    flexShrink: 1,
  },
  emptySub: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  questList: {
    gap: tokens.space[2],
  },
  questRow: {
    gap: 4,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
  questTitle: {
    ...tokens.type.caption,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    flex: 1,
    minWidth: 0,
  },
  deadlineText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  readyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255, 184, 70, 0.18)',
  },
  readyText: {
    ...tokens.type.caption,
    fontSize: 10,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_800ExtraBold',
  },
  overflowText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    marginTop: 2,
  },
});
