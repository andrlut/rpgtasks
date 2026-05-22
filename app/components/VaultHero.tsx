import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { CoinIcon } from './CoinIcon';
import { tokens } from '@/theme';

/**
 * Rewards screen header + hero (Vault variant — compact).
 *
 * Renders:
 *   - Top row: eyebrow "REWARDS" + title (eg "Sua colheita") + optional
 *     right-side stats button.
 *   - Hero strip: ambient violet halo + a horizontal `coin · balance`
 *     line (no duplicate eyebrow), then a one-line status caption.
 *
 * Stacking coin + value horizontally cuts the hero height roughly in
 * half — important on small phones where the original vertical stack
 * with a 140-pt coin pushed the actual reward grid below the fold.
 */

interface Props {
  title: string;
  /** Small uppercase eyebrow above the title (shown next to top action). */
  topEyebrow: string;
  /** The numeric balance. Pre-formatted (the caller decides locale). */
  balanceLabel: string;
  /** One-line status caption below the balance. */
  status: string;
  /** Optional handler for the top-right stats button. Hidden if absent. */
  onStatsPress?: () => void;
}

export function VaultHero({
  title,
  topEyebrow,
  balanceLabel,
  status,
  onStatsPress,
}: Props) {
  return (
    <View style={styles.root}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.topTextBlock}>
          <Text style={styles.topEyebrow}>{topEyebrow}</Text>
          <Text style={styles.topTitle}>{title}</Text>
        </View>
        {onStatsPress && (
          <Pressable
            onPress={onStatsPress}
            style={({ pressed }) => [styles.statsBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View rewards stats"
          >
            <Ionicons name="stats-chart" size={15} color={tokens.text.mid} />
          </Pressable>
        )}
      </View>

      {/* Hero strip */}
      <View style={styles.heroWrap}>
        {/* Ambient violet halo — sized large enough that the radial fade
            reaches the screen edges before going fully transparent
            (otherwise the halo reads as a small disk against the dark
            background instead of a soft glow). */}
        <View style={styles.haloWrap} pointerEvents="none">
          <Svg width={480} height={320} viewBox="0 0 480 320">
            <Defs>
              <RadialGradient id="vault-halo" cx="0.5" cy="0.5" r="0.5">
                <Stop offset="0" stopColor="#9B82FF" stopOpacity={0.32} />
                <Stop offset="0.5" stopColor="#9B82FF" stopOpacity={0.14} />
                <Stop offset="1" stopColor="#9B82FF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="240" cy="160" r="240" fill="url(#vault-halo)" />
          </Svg>
        </View>

        <View style={styles.heroRow}>
          <CoinIcon size={72} />
          <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
            {balanceLabel}
          </Text>
        </View>
        <Text style={styles.status} numberOfLines={2}>
          {status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // overflow: visible so the halo radial gradient can bleed beyond the
    // hero strip's content box without being clipped at the top/sides.
    overflow: 'visible',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: 0,
    gap: tokens.space[3],
  },
  topTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topEyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: '#FFE3A6',
  },
  topTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    letterSpacing: -0.3,
    color: tokens.text.hi,
  },
  statsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    position: 'relative',
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[4],
    paddingHorizontal: tokens.space[4],
    alignItems: 'center',
    gap: tokens.space[2],
    overflow: 'visible',
  },
  haloWrap: {
    // Sized exactly to the Svg (480x320) and pinned center-center within
    // heroWrap. Negative margins shift the SVG to its true center
    // independent of phone width. The parent's overflow is visible so
    // the radial fade tails into the screen background instead of being
    // clipped by the hero strip.
    position: 'absolute',
    width: 480,
    height: 320,
    top: '50%',
    left: '50%',
    marginTop: -160,
    marginLeft: -240,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  balance: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.2,
    color: '#FFC83D',
    textShadowColor: 'rgba(255, 200, 61, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  status: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: tokens.text.mid,
    textAlign: 'center',
    maxWidth: 280,
  },
});
