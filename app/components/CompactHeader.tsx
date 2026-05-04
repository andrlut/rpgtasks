import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { CoinIcon } from '@/components/CoinIcon';
import { tokens } from '@/theme';

interface Props {
  displayName: string;
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpNeededForLevel: number;
  coins: number;
  streakDays: number;
  /** Pre-formatted date label, e.g. "SUN, MAY 3". Already uppercase. */
  dateLabel: string;
}

/**
 * Single-row, dense header for the Tasks screen — replaces the big
 * HeroCard on Home. Date + name on top line; LV pill + XP bar + coins
 * + streak chip on the bottom line.
 *
 * Built around the V2 Spotlight design's CompactHeader (compressed to
 * fit one row so there's room for the bucket sections below). The
 * bigger HeroCard remains available for the Hero tab where status is
 * the focus rather than a side-channel.
 */
export function CompactHeader({
  displayName,
  level,
  xpInLevel,
  xpNeededForLevel,
  coins,
  streakDays,
  dateLabel,
}: Props) {
  const xpPct = xpNeededForLevel === 0 ? 0 : (xpInLevel / xpNeededForLevel) * 100;
  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>
        {dateLabel} · {displayName.toUpperCase()}
      </Text>
      <View style={styles.row}>
        {/* LV pill */}
        <View style={styles.lvPill}>
          <Text style={styles.lvLabel}>LV</Text>
          <Text style={styles.lvValue}>{level}</Text>
        </View>

        {/* XP bar (flexes) */}
        <View style={styles.barCol}>
          <View style={styles.barTrack}>
            <LinearGradient
              colors={[tokens.brand.violet, tokens.brand.violet2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${Math.min(100, xpPct)}%` }]}
            />
          </View>
        </View>
        <Text style={styles.xpText}>
          {xpInLevel}
          <Text style={styles.xpTextDim}>/{xpNeededForLevel}</Text>
        </Text>

        {/* Coins chip */}
        <View style={styles.chip}>
          <CoinIcon size={12} />
          <Text style={styles.chipText}>{coins}</Text>
        </View>

        {/* Streak chip */}
        <View style={styles.chip}>
          <Ionicons name="flame" size={12} color={tokens.semantic.warn ?? '#FF9F43'} />
          <Text style={styles.chipText}>{streakDays}d</Text>
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
    gap: 8,
  },
  eyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.6,
    color: tokens.text.dim,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lvPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },
  lvLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: tokens.brand.violet2,
  },
  lvValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
  },
  barCol: {
    flex: 1,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.bg.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.hi,
  },
  xpTextDim: {
    color: tokens.text.dim,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.hi,
  },
});
