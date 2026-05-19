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
  /** Tapping the calendar glyph in the eyebrow row opens history. */
  onHistoryPress?: () => void;
  /** When set, renders a second row with the pinned reward's progress. */
  trackedReward?: TrackedReward | null;
  /** Tap on the reward row (opens the rewards screen). */
  onTrackedRewardPress?: () => void;
}

/**
 * Two-row header for the Tasks screen — replaces the V2 single-row variant.
 * Row 1: coins · LV · XP bar (XP labels above the track).
 * Row 2 (optional): tracked reward icon + name + progress bar + percent.
 *
 * The eyebrow above keeps the date + user name as before.
 */
export function CompactHeader({
  displayName,
  level,
  xpInLevel,
  xpNeededForLevel,
  coins,
  dateLabel,
  onHistoryPress,
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
      <View style={styles.eyebrowRow}>
        <Text style={styles.eyebrow}>
          {dateLabel} · {displayName.toUpperCase()}
        </Text>
        {onHistoryPress && (
          <Pressable
            onPress={onHistoryPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="History"
            style={({ pressed }) => [styles.historyBtn, pressed && styles.historyBtnPressed]}
          >
            <Ionicons name="calendar-outline" size={14} color={tokens.text.mid} />
          </Pressable>
        )}
      </View>

      {/* Row 1: coins · LV · XP bar */}
      <View style={styles.row}>
        <View style={styles.coinChip}>
          <CoinIcon size={12} />
          <Text style={styles.coinChipText}>{coins}</Text>
        </View>

        <View style={styles.lvPill}>
          <Text style={styles.lvLabel}>LV</Text>
          <Text style={styles.lvValue}>{level}</Text>
        </View>

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
      </View>

      {/* Row 2: tracked reward (optional) */}
      {trackedReward && (
        <Pressable
          onPress={onTrackedRewardPress}
          disabled={!onTrackedRewardPress}
          style={({ pressed }) => [styles.rewardRow, pressed && styles.rewardRowPressed]}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[3],
    gap: 8,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: tokens.text.dim,
    flex: 1,
  },
  historyBtn: {
    width: 26,
    height: 22,
    borderRadius: 6,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnPressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 200, 61, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.2)',
  },
  coinChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.semantic.coin,
  },
  lvPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  lvLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.6,
    color: tokens.brand.violet2,
  },
  lvValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.brand.violet2,
  },
  xpCol: {
    flex: 1,
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
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
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
