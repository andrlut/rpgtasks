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
  coins: number;
  /** Open the picker sheet to switch to a different tracked reward. */
  onChange: () => void;
  /** Stop tracking this reward (close button in the top-right). */
  onUntrack: () => void;
  /** Buy now — shown only when affordable. */
  onBuy?: () => void;
  /** Long-press → open the Edit/Archive action sheet. Tap still swaps. */
  onLongPress?: () => void;
  isBuying?: boolean;
}

/**
 * Vault-style tracked-reward hero. Lives at the top of the Shop view when
 * the user has pinned a reward. Shares the gold-rim embossed treatment
 * with the affordable shop card, but bigger and with a gold-glowing
 * gradient progress bar.
 *
 * Layout:
 *   header  → "SUA META" eyebrow (pale gold) + untrack ✕
 *   body    → 60px reward icon tile + title/description
 *   meter   → gold gradient progress bar with glow
 *   footer  → "{coins}/{cost}" left, "faltam · pct%" right
 *
 * `onChange` is kept on the API for callers that want to swap the pinned
 * reward by tapping the card body — we route long-press for switching
 * since the card doesn't have explicit "change"/"buy" actions in the
 * Vault spec (those happen via the per-card buttons below or the picker).
 */
export function TrackedRewardCard({
  reward,
  coins,
  onChange,
  onUntrack,
  onBuy,
  onLongPress,
  isBuying,
}: Props) {
  const { t } = useT();
  const cat = REWARD_CATEGORY_META[reward.category];
  const affordable = coins >= reward.cost;
  const deficit = Math.max(0, reward.cost - coins);
  const pct = Math.min(100, Math.round((coins / reward.cost) * 100));

  return (
    <View style={styles.root}>
      {/* Dark gradient background */}
      <LinearGradient
        colors={['rgba(36,42,88,0.85)', 'rgba(20,24,60,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Faint engraved Topo Iris in the top-right corner */}
      <View style={styles.glyphWrap} pointerEvents="none">
        <PercevaGlyph size={180} bare palette="gilded" idSuffix={`tracked-${reward.id}`} />
      </View>

      <Pressable
        onPress={onChange}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.content,
          pressed && { opacity: 0.95 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Tracked reward: ${reward.title}`}
        accessibilityHint="Tap to change tracked reward. Long press to edit or archive."
      >
        {/* Header: SUA META eyebrow + untrack X */}
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="bookmark" size={12} color="#FFE3A6" />
            <Text style={styles.eyebrow}>
              {t('rewards.vault.tracked.eyebrow')}
            </Text>
          </View>
          <Pressable
            onPress={onUntrack}
            style={({ pressed }) => [styles.untrackBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
            accessibilityLabel="Stop tracking this reward"
          >
            <Ionicons name="close" size={11} color={tokens.text.mid} />
          </Pressable>
        </View>

        {/* Body: icon tile + title/description */}
        <View style={styles.body}>
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
              size={28}
              color={cat.color}
            />
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

        {/* Progress bar — dark track with gold gradient fill + glow */}
        <View style={styles.progress}>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#FFE3A6', '#FFC83D', '#C8881C']}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.progressFill, { width: `${pct}%` }]}
            />
          </View>
          <View style={styles.progressLabels}>
            <View style={styles.coinsLabel}>
              <CoinIcon size={13} />
              <Text style={styles.coinsText}>
                {coins.toLocaleString()}
                <Text style={styles.coinsDim}>
                  {' / '}
                  {reward.cost.toLocaleString()}
                </Text>
              </Text>
            </View>
            <Text style={styles.deficitText}>
              {t('rewards.vault.tracked.remaining', {
                deficit: deficit.toLocaleString(),
                pct,
              })}
            </Text>
          </View>
        </View>

        {/* Affordable CTA — shown only when affordable */}
        {affordable && onBuy ? (
          <Pressable
            onPress={onBuy}
            disabled={isBuying}
            style={({ pressed }) => [
              styles.cta,
              pressed && { opacity: 0.85 },
              isBuying && { opacity: 0.6 },
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
            <Text style={styles.ctaText}>
              {(isBuying
                ? `${t('rewards.vault.cta.buy')}…`
                : t('rewards.vault.cta.buy')
              ).toUpperCase()}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.35)',
    overflow: 'hidden',
  },
  glyphWrap: {
    position: 'absolute',
    right: -30,
    top: -10,
    width: 180,
    height: 180,
    opacity: 0.07,
  },
  content: {
    padding: 16,
    gap: 14,
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
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#FFE3A6',
  },
  untrackBtn: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    lineHeight: 21,
    color: tokens.text.hi,
  },
  subtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.mid,
  },
  progress: {
    gap: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    shadowColor: '#FFC83D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coinsText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: '#FFE3A6',
  },
  coinsDim: {
    color: tokens.text.dim,
    fontFamily: 'Manrope_700Bold',
  },
  deficitText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.mid,
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.55)',
    overflow: 'hidden',
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.7,
    color: '#3D2A00',
  },
});
