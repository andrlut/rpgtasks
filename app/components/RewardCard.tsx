import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Reward } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

import { CoinIcon } from './CoinIcon';
import { PercevaGlyph } from './PercevaGlyph';

interface Props {
  reward: Reward;
  affordable: boolean;
  /** Coins still needed to afford this reward. Drives status badge + progress. */
  deficit?: number;
  /** Current player coin balance — drives the inline progress bar fill. */
  coins: number;
  /** Currently unused (tracked rewards are hoisted to the hero TrackedCard
   *  and filtered out of the grid). Kept on the API for callers that haven't
   *  migrated. */
  tracked?: boolean;
  onRedeem: () => void;
  onEdit?: () => void;
  onLongPress?: () => void;
  /** Tap MIRAR to pin this reward. */
  onTrack?: () => void;
  /** Unused in the Vault card; kept for caller compat. */
  onUntrack?: () => void;
  isRedeeming?: boolean;
}

/** Deficit threshold that flips the card from "Quase" to "Meta". */
const ALMOST_THRESHOLD = 800;

/**
 * Vault-style reward card. Two halves stacked:
 *
 *   Top half — icon tile (left) + status badge (right), then category
 *   eyebrow + title + description. When unaffordable, a thin gradient
 *   progress bar follows.
 *
 *   Bottom half — cost (mini coin + value) on the left, COMPRAR (gold
 *   gradient) or MIRAR (violet pill) on the right.
 *
 * The whole card surface is decorated based on whether it's affordable —
 * gold rim + warm gradient + engraved Topo Iris glyph in the corner when
 * yes, cool gradient + subtle border otherwise.
 */
export function RewardCard({
  reward,
  affordable,
  deficit = 0,
  coins,
  onRedeem,
  onEdit,
  onLongPress,
  onTrack,
  isRedeeming,
}: Props) {
  const { t } = useT();
  const cat = REWARD_CATEGORY_META[reward.category];
  const accent = affordable ? '#FFC83D' : cat.color;
  const pct = Math.max(0, Math.min(100, Math.round((coins / reward.cost) * 100)));

  const status: 'ready' | 'almost' | 'goal' = affordable
    ? 'ready'
    : deficit <= ALMOST_THRESHOLD
      ? 'almost'
      : 'goal';

  const badge = (() => {
    if (status === 'ready') {
      return {
        label: t('rewards.vault.status.ready'),
        color: '#FFE3A6',
        bgColors: ['rgba(255,224,138,0.25)', 'rgba(255,200,61,0.1)'] as const,
        borderColor: 'rgba(255,200,61,0.45)',
        icon: 'flash' as const,
      };
    }
    if (status === 'almost') {
      return {
        label: t('rewards.vault.status.almost'),
        color: '#FFB377',
        bgColors: ['rgba(255,159,67,0.18)', 'rgba(255,159,67,0.18)'] as const,
        borderColor: 'rgba(255,159,67,0.4)',
        icon: 'flame' as const,
      };
    }
    return {
      label: t('rewards.vault.status.goal'),
      color: cat.color,
      bgColors: [`${cat.color}1c`, `${cat.color}1c`] as const,
      borderColor: `${cat.color}40`,
      icon: 'star' as const,
    };
  })();

  return (
    <View
      style={[
        styles.root,
        {
          borderColor: affordable
            ? 'rgba(255,200,61,0.45)'
            : 'rgba(255,255,255,0.07)',
        },
      ]}
    >
      {/* Surface gradient */}
      <LinearGradient
        colors={
          affordable
            ? ['rgba(50,38,18,0.7)', 'rgba(20,24,60,0.9)']
            : ['rgba(36,42,88,0.65)', 'rgba(20,24,60,0.85)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Engraved glyph — affordable cards only, bottom-right corner. */}
      {affordable && (
        <View style={styles.glyphWrap} pointerEvents="none">
          <PercevaGlyph
            size={120}
            bare
            palette="gilded"
            idSuffix={`rc-${reward.id}`}
          />
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.content,
          pressed && onEdit && { opacity: 0.92 },
        ]}
        onPress={onEdit}
        onLongPress={onLongPress}
        disabled={!onEdit && !onLongPress}
        accessibilityRole="button"
        accessibilityLabel={`${reward.title}, ${reward.cost} coins`}
        accessibilityHint={
          onLongPress
            ? 'Tap to edit. Long press to archive or delete.'
            : 'Tap to edit.'
        }
      >
        <View style={styles.top}>
          {/* Top row: icon tile + status badge */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.iconTile,
                {
                  borderColor: `${cat.color}50`,
                  backgroundColor: `${cat.color}26`,
                },
              ]}
            >
              <Ionicons
                name={reward.icon as never}
                size={20}
                color={cat.color}
              />
            </View>
            <View
              style={[
                styles.badge,
                {
                  borderColor: badge.borderColor,
                },
              ]}
            >
              <LinearGradient
                colors={[badge.bgColors[0], badge.bgColors[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name={badge.icon} size={9} color={badge.color} />
              <Text
                style={[styles.badgeText, { color: badge.color }]}
                numberOfLines={1}
              >
                {badge.label.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Category eyebrow */}
          <Text
            style={[styles.eyebrow, { color: cat.color }]}
            numberOfLines={1}
          >
            {cat.label.toUpperCase()}
          </Text>

          {/* Title + optional description */}
          <Text style={styles.title} numberOfLines={2}>
            {reward.title}
          </Text>
          {reward.description ? (
            <Text style={styles.description} numberOfLines={1}>
              {reward.description}
            </Text>
          ) : null}

          {/* Progress bar (unaffordable only) */}
          {!affordable && (
            <View style={styles.progressBlock}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[cat.color, accent]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[styles.progressFill, { width: `${pct}%` }]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {t('rewards.vault.remaining', {
                  deficit: deficit.toLocaleString(),
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Footer: cost + CTA */}
        <View style={styles.footer}>
          <View style={styles.costLine}>
            <CoinIcon size={14} />
            <Text
              style={[
                styles.cost,
                { color: affordable ? '#FFE3A6' : tokens.text.dim },
              ]}
            >
              {reward.cost.toLocaleString()}
            </Text>
          </View>

          {affordable ? (
            <Pressable
              onPress={onRedeem}
              disabled={isRedeeming}
              style={({ pressed }) => [
                styles.cta,
                styles.ctaBuy,
                pressed && { opacity: 0.85 },
                isRedeeming && { opacity: 0.6 },
              ]}
              hitSlop={6}
            >
              <LinearGradient
                colors={['#FFE890', '#FFC83D', '#C8881C']}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.ctaBuyText}>
                {t('rewards.vault.cta.buy').toUpperCase()}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onTrack}
              disabled={!onTrack}
              style={({ pressed }) => [
                styles.cta,
                styles.ctaTrack,
                pressed && onTrack && { opacity: 0.85 },
              ]}
              hitSlop={6}
            >
              <Ionicons
                name="bookmark"
                size={9}
                color="#C2A1FF"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.ctaTrackText}>
                {t('rewards.vault.cta.track').toUpperCase()}
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 188,
    overflow: 'hidden',
    // No elevation on Android: it ignores shadowColor and falls back to
    // a flat grey shadow that reads as an ugly halo around the card.
    // The gold rim border + inner gradient sell the embossed feel on
    // their own. iOS may pick up a subtle drop-shadow via shadowOffset
    // below but won't be noticeable without a darker shadowColor.
  },
  glyphWrap: {
    // Positioned so the glyph's center horizontally aligns roughly with
    // the COMPRAR button's center, and vertically with the footer row.
    // Center of a 120-px glyph sits at (right + 60, bottom + 60).
    // Card padding is 14; the gold pill sits ~14 + button-h/2 from
    // bottom, ~14 + ~35 from right edge.
    position: 'absolute',
    right: -25,
    bottom: -32,
    width: 120,
    height: 120,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  top: {
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    overflow: 'hidden',
  },
  badgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    lineHeight: 18,
    color: tokens.text.hi,
    marginBottom: 2,
  },
  description: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 15,
    color: tokens.text.mid,
  },
  progressBlock: {
    marginTop: 10,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
    color: tokens.text.dim,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  costLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cost: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ctaBuy: {
    borderColor: 'rgba(255,224,138,0.55)',
  },
  ctaBuyText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.7,
    color: '#3D2A00',
  },
  ctaTrack: {
    borderColor: 'rgba(155,130,255,0.35)',
    backgroundColor: 'rgba(155,130,255,0.1)',
    paddingHorizontal: 10,
  },
  ctaTrackText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.7,
    color: '#C2A1FF',
  },
});
