import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { RewardTemplate } from '@/lib/db/types';
import { useLocalizedPick } from '@/lib/i18n/catalog';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

import { CoinIcon } from './CoinIcon';
import { PercevaGlyph } from './PercevaGlyph';

/**
 * Inspiration / template row in the Vault Rewards screen.
 *
 * Mirrors the affordable shop-card chrome (gold rim + warm gradient bg +
 * engraved Topo Iris glyph behind a gold "+" CTA aligned over the glyph
 * center) so the suggestion strip feels native to the Vault, not a
 * lighter afterthought.
 *
 * Layout is horizontal: category icon tile + body (eyebrow + title +
 * description + mini coin cost) + "+" pill on the right.
 */
interface Props {
  template: RewardTemplate;
  onAdd: () => void;
  isAdding?: boolean;
}

export function TemplateCard({ template, onAdd, isAdding }: Props) {
  const { pick, pickNullable } = useLocalizedPick();
  const cat = REWARD_CATEGORY_META[template.category];
  const title = pick(template.title, template.title_pt);
  const description = pickNullable(template.description, template.description_pt);

  return (
    <Pressable
      onPress={onAdd}
      disabled={isAdding}
      style={({ pressed }) => [styles.root, (pressed || isAdding) && { opacity: 0.92 }]}
    >
      {/* Dark gradient surface */}
      <LinearGradient
        colors={['rgba(50,38,18,0.55)', 'rgba(20,24,60,0.85)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Faint engraved glyph aligned vertically with the + pill on the
          right edge of the card. */}
      <View style={styles.glyphWrap} pointerEvents="none">
        <PercevaGlyph
          size={110}
          bare
          palette="gilded"
          idSuffix={`tmpl-${template.id}`}
        />
      </View>

      {/* Category icon tile */}
      <View
        style={[
          styles.iconTile,
          {
            borderColor: `${cat.color}50`,
            backgroundColor: `${cat.color}26`,
          },
        ]}
      >
        <Ionicons name={template.icon as never} size={22} color={cat.color} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={[styles.eyebrow, { color: cat.color }]} numberOfLines={1}>
          {cat.label.toUpperCase()}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        <View style={styles.costRow}>
          <CoinIcon size={11} />
          <Text style={styles.cost}>{template.cost.toLocaleString()}</Text>
        </View>
      </View>

      {/* + CTA — gold gradient pill, same DNA as COMPRAR */}
      <View style={styles.ctaWrap}>
        <LinearGradient
          colors={['#FFE890', '#FFC83D', '#C8881C']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cta}
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#3D2A00" />
          ) : (
            <Ionicons name="add" size={20} color="#3D2A00" />
          )}
        </LinearGradient>
      </View>
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
    borderColor: 'rgba(255,200,61,0.35)',
    overflow: 'hidden',
  },
  glyphWrap: {
    position: 'absolute',
    right: -20,
    top: '50%',
    width: 110,
    height: 110,
    // The Topo Iris's pupil sits at the exact bounding-box center, but
    // the path diagonal's top-right endpoint pulls the visual mass
    // upward. Nudging the box ~10px down lines the iris up with the
    // vertically-centered "+" pill on the right.
    marginTop: -45,
    opacity: 0.09,
  },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    lineHeight: 18,
    color: tokens.text.hi,
  },
  subtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 14,
    color: tokens.text.mid,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cost: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: '#FFE3A6',
  },
  ctaWrap: {
    flexShrink: 0,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.55)',
  },
  cta: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
