import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Reward } from '@/lib/db/types';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

import { CoinIcon } from './CoinIcon';
import { ProgressBar } from './ProgressBar';

interface Props {
  reward: Reward;
  coins: number;
  onChange: () => void;
  onUntrack: () => void;
  onBuy?: () => void;
  isBuying?: boolean;
}

/**
 * Wide hero card surfaced at the top of the Rewards screen when the user has
 * a tracked reward. Shows coins-vs-cost progress, current state copy, and
 * the two affordances for switching or removing the tracked reward.
 *
 * - Affordable → primary CTA "Buy" (lights up gold).
 * - Not affordable → progress bar carries the narrative; CTA is "Change".
 */
export function TrackedRewardCard({
  reward,
  coins,
  onChange,
  onUntrack,
  onBuy,
  isBuying,
}: Props) {
  const cat = REWARD_CATEGORY_META[reward.category];
  const affordable = coins >= reward.cost;
  const deficit = Math.max(0, reward.cost - coins);
  const pct = Math.min(100, Math.round((coins / reward.cost) * 100));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[`${cat.color}22`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="bookmark" size={12} color={cat.color} />
          <Text style={[styles.eyebrow, { color: cat.color }]}>Tracking</Text>
        </View>
        <Pressable
          onPress={onUntrack}
          style={({ pressed }) => [styles.untrackBtn, pressed && { opacity: 0.6 }]}
          hitSlop={10}
          accessibilityLabel="Stop tracking this reward"
        >
          <Ionicons name="close" size={16} color={tokens.text.mid} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={[styles.iconWrap, { backgroundColor: cat.bg }]}>
          <Ionicons name={reward.icon as never} size={28} color={cat.color} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={2}>
            {reward.title}
          </Text>
          {reward.description ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {reward.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.progressRow}>
        <ProgressBar
          value={Math.min(coins, reward.cost)}
          max={reward.cost}
          color={affordable ? tokens.semantic.coin : cat.color}
          height={8}
        />
        <View style={styles.progressLabels}>
          <View style={styles.coinsLabel}>
            <CoinIcon size={12} />
            <Text style={styles.progressText}>
              {coins.toLocaleString()} / {reward.cost.toLocaleString()}
            </Text>
          </View>
          <Text
            style={[
              styles.statusText,
              { color: affordable ? tokens.semantic.coin : tokens.text.mid },
            ]}
          >
            {affordable
              ? 'Yours to claim'
              : `${deficit.toLocaleString()} to go · ${pct}%`}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onChange}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          hitSlop={4}
        >
          <Ionicons name="swap-horizontal" size={14} color={tokens.text.base} />
          <Text style={styles.secondaryBtnText}>Change</Text>
        </Pressable>

        {affordable && onBuy ? (
          <Pressable
            onPress={onBuy}
            disabled={isBuying}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
            hitSlop={4}
          >
            <LinearGradient
              colors={tokens.gradient.coinBtn}
              locations={tokens.gradient.coinBtnLocations}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.primaryBtn, isBuying && { opacity: 0.7 }]}
            >
              <Text style={styles.primaryBtnText}>
                {isBuying ? 'BUYING…' : 'BUY NOW'}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    padding: tokens.space[4],
    gap: tokens.space[3],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    ...tokens.type.eyebrow,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  untrackBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  subtitle: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  progressRow: {
    gap: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressText: {
    ...tokens.type.caption,
    color: tokens.text.base,
    fontFamily: 'Manrope_700Bold',
  },
  statusText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.space[2],
    marginTop: 2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  secondaryBtnText: {
    ...tokens.type.caption,
    color: tokens.text.base,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  primaryBtn: {
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 235, 180, 0.4)',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: '#3D2A00',
    letterSpacing: 0.6,
  },
});
