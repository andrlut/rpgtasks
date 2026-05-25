import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CoinIcon } from './CoinIcon';
import { PercevaGlyph } from './PercevaGlyph';
import type { RedemptionEntry } from '@/lib/api/rewards';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

/**
 * Bank card — a bought-but-not-yet-used reward sitting in the user's bank.
 *
 * Shares the embossed Vault DNA with the affordable shop card: gold-tinted
 * border, gold inner glow shadow, dark gradient background, faint Topo Iris
 * glyph engraved on the right edge (vertically centered, aligned with the
 * USAR button). Title is allowed to wrap multiple lines — the card grows
 * vertically rather than truncating.
 *
 * Category eyebrow ("INDULGÊNCIAS" / "BENS" / "EXPERIÊNCIAS") prefixes the
 * title in the category accent color.
 */

interface Props {
  entry: RedemptionEntry;
  /** Localized CTA label, e.g. "Usar". */
  cta: string;
  /** Localized timestamp string like "conquistado ontem". */
  earnedTime: string;
  busy?: boolean;
  onUse: () => void;
  /** Long-press opens the bank action sheet (Usar / Vender). */
  onLongPress?: () => void;
}

export function VaultBankCard({
  entry,
  cta,
  earnedTime,
  busy,
  onUse,
  onLongPress,
}: Props) {
  const { t } = useT();
  const cat = entry.reward_category
    ? REWARD_CATEGORY_META[entry.reward_category]
    : null;
  const accent = cat?.color ?? tokens.text.mid;

  return (
    <Pressable
      style={styles.root}
      onLongPress={onLongPress}
      // No onPress — tap on the row body is intentionally inert so the
      // user doesn't fire any action by accident while reading. Long
      // press opens the action sheet (Usar / Vender). Inner USE button
      // (its own Pressable below) keeps working independently.
      delayLongPress={400}
      disabled={!onLongPress}
      accessibilityRole="button"
      accessibilityLabel={entry.reward_title}
      accessibilityHint={
        onLongPress ? 'Long press to use or sell.' : undefined
      }
    >
      {/* Dark gradient surface — warm top fades into cool bottom, same
          treatment used by affordable shop cards. */}
      <LinearGradient
        colors={['rgba(50,38,18,0.7)', 'rgba(20,24,60,0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Engraved glyph behind the content, centered vertically and
          slightly bleeding off the right edge — feels carved into the
          surface. */}
      <View style={styles.glyphWrap} pointerEvents="none">
        <PercevaGlyph size={120} bare palette="gilded" idSuffix={`bank-${entry.id}`} />
      </View>

      {/* Icon tile */}
      <View
        style={[
          styles.iconTile,
          {
            borderColor: `${accent}55`,
            backgroundColor: cat ? `${accent}26` : 'rgba(255,255,255,0.05)',
          },
        ]}
      >
        <Ionicons
          name={entry.reward_icon as never}
          size={22}
          color={accent}
        />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {cat && entry.reward_category && (
          <Text style={[styles.eyebrow, { color: accent }]} numberOfLines={1}>
            {t(`rewards.categories.${entry.reward_category}` as const).toUpperCase()}
          </Text>
        )}
        <Text style={styles.title}>{entry.reward_title}</Text>
        <View style={styles.metaRow}>
          <CoinIcon size={11} />
          <Text style={styles.metaCost}>
            {entry.cost_paid.toLocaleString()}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaTime} numberOfLines={1}>
            {earnedTime}
          </Text>
        </View>
      </View>

      {/* USE CTA — green gradient pill */}
      <Pressable
        disabled={busy}
        onPress={onUse}
        style={({ pressed }) => [
          styles.useBtnWrap,
          pressed && { opacity: 0.85 },
          busy && { opacity: 0.6 },
        ]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${cta} ${entry.reward_title}`}
      >
        <LinearGradient
          colors={['#6FE8AA', '#3DD68C', '#1F8A5B']}
          locations={[0, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.useBtn}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#062416" />
          ) : (
            <Text style={styles.useBtnText}>{cta.toUpperCase()}</Text>
          )}
        </LinearGradient>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,200,61,0.45)',
    overflow: 'hidden',
    // No elevation: Android ignores shadowColor and would paint a flat
    // grey halo. The gold border + warm gradient bg carry the embossed
    // feel without it.
  },
  glyphWrap: {
    position: 'absolute',
    right: -10,
    top: '50%',
    width: 120,
    height: 120,
    // -60 would be exact center, but the Topo Iris's diagonal top-right
    // endpoint pulls the visual mass up. Nudging the box ~10px down
    // lines the iris up with the vertically-centered USAR pill.
    marginTop: -50,
    opacity: 0.09,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    lineHeight: 18,
    color: tokens.text.hi,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaCost: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: '#FFE3A6',
  },
  metaDot: {
    color: tokens.text.dim,
    fontSize: 11,
  },
  metaTime: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    flexShrink: 1,
  },
  useBtnWrap: {
    flexShrink: 0,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(111,232,170,0.55)',
  },
  useBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.7,
    color: '#062416',
  },
});
