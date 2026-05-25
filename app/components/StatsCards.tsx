import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoinIcon } from '@/components/CoinIcon';
import { PercevaGlyph } from '@/components/PercevaGlyph';
import { tokens } from '@/theme';

// ─────────────────────────────────────────────────────────────────────────────
// XP card — first row of the home screen's stats area.
//
//   ┌──────────────────────────────────────────────────┐
//   │ XP   ▰▰▰▰▱▱   290/500              [LV 3]   ⟁  │
//   └──────────────────────────────────────────────────┘
//
// Gradient surface + inset top highlight, engraved Topo Iris glyph
// in the bottom-right corner. The "LV N" pill sits on the right at
// the same height as the bar so the row reads as one continuous
// chip-bar-chip composition.
// ─────────────────────────────────────────────────────────────────────────────

interface XPProps {
  level: number;
  xpInLevel: number;
  xpNeededForLevel: number;
}

export function XPStatsCard({ level, xpInLevel, xpNeededForLevel }: XPProps) {
  const pct =
    xpNeededForLevel === 0 ? 0 : (xpInLevel / xpNeededForLevel) * 100;

  return (
    <View style={styles.cardWrap}>
      <LinearGradient
        colors={tokens.gradient.todayHero}
        locations={tokens.gradient.todayHeroLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardBg}
      />
      <View style={[styles.cardBorder, styles.cardBorderViolet]} pointerEvents="none" />
      <View style={styles.glyphSlot} pointerEvents="none">
        <PercevaGlyph
          size={130}
          bare
          palette="gilded"
          idSuffix="stats-xp"
        />
      </View>

      <View style={styles.barRow}>
        <Text style={styles.lbl}>XP</Text>
        <View style={styles.barTrack}>
          <LinearGradient
            colors={[tokens.brand.violet, tokens.brand.violet2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.barFill, { width: `${Math.min(100, pct)}%` }]}
          />
        </View>
        <Text style={styles.pct}>
          {xpInLevel}
          <Text style={styles.pctDen}>/{xpNeededForLevel}</Text>
        </Text>
        <View style={styles.lvChip}>
          <Text style={styles.lvChipText}>LV {level}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reward card — second row of the stats area. Only renders when there's
// a tracked reward (the home pins one via track-picker). Shares the
// same surface vocabulary as the XP card so the two read as a stack.
// ─────────────────────────────────────────────────────────────────────────────

interface RewardProps {
  rewardName: string;
  /** Ionicon name from `reward.icon` — rendered as the leading glyph. */
  iconName?: string;
  /** Current coin total (the bank balance, in coin units). */
  coins: number;
  /** Cost of the tracked reward — drives the progress percentage. */
  totalCoins: number;
  onPress?: () => void;
}

export function RewardStatsCard({
  rewardName,
  iconName,
  coins,
  totalCoins,
  onPress,
}: RewardProps) {
  const pct =
    totalCoins > 0 ? Math.min(100, (coins / totalCoins) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.cardWrap,
        pressed && onPress && styles.cardPressed,
      ]}
    >
      <LinearGradient
        colors={tokens.gradient.todayHero}
        locations={tokens.gradient.todayHeroLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardBg}
      />
      <View style={[styles.cardBorder, styles.cardBorderGold]} pointerEvents="none" />
      <View style={styles.glyphSlot} pointerEvents="none">
        <PercevaGlyph
          size={130}
          bare
          palette="gilded"
          idSuffix="stats-reward"
        />
      </View>

      <View style={styles.rewardBarRow}>
        <View style={styles.rewardIcon}>
          <Ionicons
            name={(iconName as never) ?? ('gift-outline' as never)}
            size={14}
            color={tokens.semantic.coinLight}
          />
        </View>
        <View style={styles.rewardCol}>
          <Text style={styles.rewardName} numberOfLines={1}>
            {rewardName}
          </Text>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={tokens.gradient.rewardBarFill}
              locations={tokens.gradient.rewardBarFillLocations}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.barFill,
                styles.rewardBarFill,
                { width: `${pct}%` },
              ]}
            />
          </View>
        </View>
        <Text style={styles.rewardPct}>{Math.round(pct)}%</Text>
        <View style={styles.coinBal}>
          <CoinIcon size={11} />
          <Text style={styles.coinBalText}>{coins}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    position: 'relative',
    marginHorizontal: tokens.space[4],
    marginTop: tokens.space[3],
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 50,
    justifyContent: 'center',
    ...tokens.shadow.deep,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardBg: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  // Each card borrows its inset-highlight rim color from the tone it
  // represents: violet for XP, gold for the tracked reward.
  cardBorderViolet: {
    borderTopColor: 'rgba(155, 130, 255, 0.22)',
  },
  cardBorderGold: {
    borderTopColor: 'rgba(255, 224, 138, 0.18)',
  },
  glyphSlot: {
    position: 'absolute',
    bottom: -30,
    right: -28,
    width: 130,
    height: 130,
    opacity: 0.07,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lbl: {
    width: 22,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1,
    color: tokens.text.mid,
  },
  barTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: tokens.bg.surface3,
    overflow: 'hidden',
    minWidth: 60,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  rewardBarFill: {
    // Soft gold halo around the reward fill so it reads as a "live"
    // bar (more eye-catching than the violet XP).
    shadowColor: tokens.semantic.coin,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  pct: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.text.hi,
  },
  pctDen: {
    fontFamily: 'Manrope_700Bold',
    color: tokens.text.faint,
  },
  lvChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: tokens.brand.violetGlow,
  },
  lvChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.brand.violet2,
    letterSpacing: 0.4,
  },
  rewardBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCol: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  rewardName: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.semantic.coinLight,
    letterSpacing: 0.2,
  },
  rewardPct: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.text.hi,
  },
  coinBal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinBalText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.semantic.coin,
  },
});

