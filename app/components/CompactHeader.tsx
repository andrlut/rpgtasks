import { Ionicons } from '@expo/vector-icons';
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
 *   Row 1: date · NAME (eyebrow, flex)   LV pill   XP bar (flex)
 *   Row 2: coin chip   ── reward row (icon + name + bar + %)
 *
 * History / Manage shortcuts moved out to live next to the TodayRing —
 * see `app/components/TodayRing.tsx`. Bigger tap targets there, freer
 * space here for the level + XP up top.
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
      {/* Row 1: date · NAME + LV pill + XP bar */}
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {dateLabel} · {displayName.toUpperCase()}
        </Text>

        <View style={styles.xpCol}>
          <View style={styles.xpLabels}>
            <Text style={styles.xpLabelLeft}>XP</Text>
            <Text style={styles.xpLabelRight}>
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

        {/* LV pill anchors to the right of its row, mirroring the coin
            chip's position on the wallet row below. Same min-width so
            the two read as a vertical pair. */}
        <View style={styles.statPill}>
          <Text style={styles.lvLabel}>LV</Text>
          <Text style={styles.lvValue}>{level}</Text>
        </View>
      </View>

      {/* Row 2: tracked reward (optional bar) + coin chip on the right */}
      <View style={styles.walletRow}>
        {trackedReward ? (
          <Pressable
            onPress={onTrackedRewardPress}
            disabled={!onTrackedRewardPress}
            style={({ pressed }) => [
              styles.rewardRow,
              pressed && styles.rewardRowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Tracked reward: ${trackedReward.name}`}
          >
            <View style={styles.rewardIcon}>
              <Ionicons
                name={trackedReward.icon as never}
                size={12}
                color={tokens.semantic.coin}
              />
            </View>
            <View style={styles.rewardCol}>
              <View style={styles.rewardLabels}>
                <Text style={styles.rewardName} numberOfLines={1}>
                  🎯 {trackedReward.name}
                </Text>
                <Text style={styles.rewardPct}>{Math.round(rewardPct)}%</Text>
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
            </View>
          </Pressable>
        ) : (
          // No reward to track — keep the row balanced so the coin
          // chip still anchors to the right edge.
          <View style={styles.rewardRow} />
        )}

        <View style={[styles.statPill, styles.coinPill]}>
          <CoinIcon size={12} />
          <Text style={styles.coinChipText}>{coins}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[3],
    gap: 10,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: tokens.text.dim,
    flexShrink: 1,
  },
  // Shared shape for the LV pill (eyebrow row, right) and coin chip
  // (wallet row, right). Same min-width and padding so they stack as a
  // visual column on the right edge of the header.
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
  xpCol: {
    flex: 1,
    minWidth: 90,
  },
  xpLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  xpLabelLeft: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.mid,
  },
  xpLabelRight: {
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
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coinChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.semantic.coin,
  },
  rewardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rewardRowPressed: {
    opacity: 0.7,
  },
  rewardIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 200, 61, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCol: {
    flex: 1,
  },
  rewardLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 8,
  },
  rewardName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.mid,
    flex: 1,
  },
  rewardPct: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.semantic.coin,
  },
  rewardBarFill: {
    backgroundColor: tokens.semantic.coin,
  },
});
