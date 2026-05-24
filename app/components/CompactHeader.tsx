import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoinIcon } from '@/components/CoinIcon';
import { tokens } from '@/theme';

interface TrackedReward {
  name: string;
  currentCoins: number;
  totalCoins: number;
  icon: string;
}

interface Props {
  displayName: string;
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpNeededForLevel: number;
  coins: number;
  /** Pre-formatted date label, e.g. "SUN, MAY 3". Already uppercase. */
  dateLabel: string;
  /** When set, renders a second row with the pinned reward's progress. */
  trackedReward?: TrackedReward | null;
  /** Tap on the reward row (opens the rewards screen). */
  onTrackedRewardPress?: () => void;
}

/**
 * Two-row header for the Tasks screen — V3 layout.
 *
 *   ┌─────────────┬───────────────────────────┬──────────┐
 *   │ SUN, MAY 24 │ XP bar ────────────────── │ LV 3     │
 *   │ DECO        │ 🎯 reward ─────────────── │ 535 coin │
 *   └─────────────┴───────────────────────────┴──────────┘
 *
 * Three columns, two rows. Left column stacks date + name (uppercase
 * eyebrow style). Middle column flexes and holds the two progress
 * bars — both start at the same X so they line up vertically. Right
 * column holds the LV + coin pills, sharing a `statPill` shape so
 * they read as a tidy column.
 *
 * History / Manage shortcuts live next to the TodayRing — see
 * `app/components/TodayRing.tsx`.
 */
export function CompactHeader({
  displayName,
  level,
  xpInLevel,
  xpNeededForLevel,
  coins,
  dateLabel,
  trackedReward,
  onTrackedRewardPress,
}: Props) {
  const xpPct = xpNeededForLevel === 0 ? 0 : (xpInLevel / xpNeededForLevel) * 100;
  const rewardPct =
    trackedReward && trackedReward.totalCoins > 0
      ? Math.min(100, (trackedReward.currentCoins / trackedReward.totalCoins) * 100)
      : 0;

  return (
    <View style={styles.wrap}>
      {/* Row 1: date · XP bar · LV pill */}
      <View style={styles.row}>
        <Text style={styles.leftLabel} numberOfLines={1}>
          {dateLabel}
        </Text>

        <View style={styles.barCol}>
          <View style={styles.barLabels}>
            <Text style={styles.barLabelLeft}>XP</Text>
            <Text style={styles.barLabelRight}>
              {xpInLevel} / {xpNeededForLevel}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={[tokens.brand.violet, tokens.brand.violet2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${Math.min(100, xpPct)}%` }]}
            />
          </View>
        </View>

        <View style={styles.statPill}>
          <Text style={styles.lvLabel}>LV</Text>
          <Text style={styles.lvValue}>{level}</Text>
        </View>
      </View>

      {/* Row 2: name · reward bar (optional) · coin pill */}
      <View style={styles.row}>
        <Text style={styles.leftLabel} numberOfLines={1}>
          {displayName.toUpperCase()}
        </Text>

        {trackedReward ? (
          <Pressable
            onPress={onTrackedRewardPress}
            disabled={!onTrackedRewardPress}
            style={({ pressed }) => [
              styles.barCol,
              pressed && styles.rewardRowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Tracked reward: ${trackedReward.name}`}
          >
            <View style={styles.barLabels}>
              <Text style={[styles.barLabelLeft, { color: tokens.text.mid }]} numberOfLines={1}>
                🎯 {trackedReward.name}
              </Text>
              <Text style={[styles.barLabelRight, { color: tokens.semantic.coin }]}>
                {Math.round(rewardPct)}%
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  styles.rewardBarFill,
                  { width: `${rewardPct}%` },
                ]}
              />
            </View>
          </Pressable>
        ) : (
          // No reward to track — keep the row balanced so the coin
          // pill still anchors to the right edge.
          <View style={styles.barCol} />
        )}

        <View style={[styles.statPill, styles.coinPill]}>
          <CoinIcon size={12} />
          <Text style={styles.coinChipText}>{coins}</Text>
        </View>
      </View>
    </View>
  );
}

const LEFT_LABEL_WIDTH = 76;

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[3],
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // Fixed-width label column on the left — same width on both rows so
  // the bars to its right start at the same X.
  leftLabel: {
    width: LEFT_LABEL_WIDTH,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: tokens.text.dim,
  },
  barCol: {
    flex: 1,
    minWidth: 90,
  },
  barLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 8,
  },
  barLabelLeft: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.mid,
  },
  barLabelRight: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.brand.violet2,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.bg.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  rewardBarFill: {
    backgroundColor: tokens.semantic.coin,
  },
  rewardRowPressed: {
    opacity: 0.7,
  },
  // Shared shape for the LV pill (row 1) and coin chip (row 2). Same
  // min-width and padding so they stack as a tidy column on the right.
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 64,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  coinPill: {
    backgroundColor: 'rgba(255, 200, 61, 0.14)',
    borderColor: 'rgba(255, 200, 61, 0.2)',
  },
  lvLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
    color: tokens.brand.violet2,
  },
  lvValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.brand.violet2,
  },
  coinChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.semantic.coin,
  },
});
