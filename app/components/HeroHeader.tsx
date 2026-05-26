import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { useCharacter } from '@/lib/api/character';
import { heroTitle } from '@/lib/heroTitle';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

const AVATAR = 92;
const RING_R = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

/**
 * Iris-Wrapped Avatar — full-width header for the Eu tab. Replaces the
 * previous LevelRing + chip layout with a Perceva-native composition:
 * concentric brand rings + gold-path signature + dim-tile center + XP
 * progress arc wrapping the whole avatar. Eyebrow communicates rank
 * (LV N · BODY APPRENTICE); name reads big and quiet; XP bar runs the
 * full width of the screen with a faint divider below.
 *
 * Not a card — no border, full-width, ambient violet halo bleeding from
 * the top-left corner. Pure display; no interaction.
 *
 * Data is read via hooks so the component is self-contained.
 */
export function HeroHeader() {
  const character = useCharacter();
  const metaLookup = useMetaLookup();
  const { locale } = useT();

  const totalXp = character.data?.character.total_xp ?? 0;
  const lp = levelProgress(totalXp);
  const displayName = character.data?.profile.display_name ?? 'Hero';

  // Dominant dim = the dim carrying the most XP. Falls back to "body"
  // for brand-new accounts where every dim is at zero.
  const dominantDim = useMemo(() => {
    const dims = character.data?.dimensions ?? [];
    if (dims.length === 0) return null;
    return dims.reduce((a, b) => (b.xp > a.xp ? b : a), dims[0]);
  }, [character.data?.dimensions]);

  const dimId = dominantDim?.dimension_id ?? 'body';
  const dimMeta = DIMENSION_META[dimId];
  const dimLabel = metaLookup.dim(dimId).label;
  const hasAnyXp = (dominantDim?.xp ?? 0) > 0;

  // Progress arc — proportion of the current level's XP earned.
  const progressFraction = lp.fraction;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progressFraction);

  const title = heroTitle(lp.level, hasAnyXp ? dimLabel : null, locale);

  return (
    <View style={styles.root}>
      {/* Ambient violet halo — bleeds in from the top-left. Sits behind
          everything else; not interactive. */}
      <View style={styles.halo} pointerEvents="none">
        <Svg width={320} height={320} viewBox="0 0 320 320">
          <Defs>
            <SvgLinearGradient id="halo" x1="0.5" y1="0.5" x2="1" y2="1">
              <Stop offset="0" stopColor="#9B82FF" stopOpacity={0.22} />
              <Stop offset="0.65" stopColor="#9B82FF" stopOpacity={0} />
            </SvgLinearGradient>
          </Defs>
          <Circle cx={160} cy={160} r={160} fill="url(#halo)" />
        </Svg>
      </View>

      <View style={styles.row}>
        {/* Avatar — single SVG, layered: progress ring, brand rings,
            gold path, dim tile. Icon overlay sits on top in a View so
            we can use the Ionicon font directly. */}
        <View style={styles.avatarWrap}>
          <Svg width={AVATAR} height={AVATAR} viewBox={`0 0 ${AVATAR} ${AVATAR}`}>
            <Defs>
              <SvgLinearGradient
                id="xpRing"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <Stop offset="0" stopColor="#A08FFF" />
                <Stop offset="1" stopColor="#7B5CFF" />
              </SvgLinearGradient>
            </Defs>

            {/* XP progress ring — track + colored fill. Rotated -90 so
                fill starts at the top. */}
            <Circle
              cx={46}
              cy={46}
              r={RING_R}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={4}
              fill="none"
            />
            <Circle
              cx={46}
              cy={46}
              r={RING_R}
              stroke="url(#xpRing)"
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 46 46)`}
            />

            {/* Concentric brand rings — Topo Iris reference in miniature. */}
            <Circle
              cx={46}
              cy={46}
              r={34}
              stroke="rgba(255,227,166,0.35)"
              strokeWidth={1}
              fill="none"
            />
            <Circle
              cx={46}
              cy={46}
              r={28}
              stroke="rgba(255,227,166,0.35)"
              strokeWidth={1}
              fill="none"
            />
            <Circle
              cx={46}
              cy={46}
              r={22}
              stroke="rgba(255,227,166,0.35)"
              strokeWidth={1}
              fill="none"
            />

            {/* Gold diagonal — the brand signature. */}
            <Path
              d="M 22 65 Q 36 56 46 46 Q 56 36 70 27"
              fill="none"
              stroke="#FFE3A6"
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.65}
            />
            <Circle cx={22} cy={65} r={1.8} fill="#FFE3A6" opacity={0.75} />
            <Circle cx={70} cy={27} r={1.8} fill="#FFE3A6" opacity={0.75} />

            {/* Dim tile — color matches the dominant dim. */}
            <Circle
              cx={46}
              cy={46}
              r={18}
              fill={dimMeta.bg}
              stroke={`${dimMeta.color}73`}
              strokeWidth={1}
            />
          </Svg>
          <View style={styles.avatarIcon} pointerEvents="none">
            <Ionicons
              name={dimMeta.iconName as never}
              size={22}
              color={dimMeta.color}
            />
          </View>
        </View>

        {/* Text column */}
        <View style={styles.textCol}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowLv}>LV {lp.level}</Text>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrowTitle} numberOfLines={1}>
              {title.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </View>

      {/* Faint horizontal divider — separates header from the tab body
          without drawing a hard line. The XP progress story already lives
          in the avatar's ring; a second bar here was redundant. */}
      <LinearGradient
        colors={[
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.06)',
          'rgba(255,255,255,0.06)',
          'rgba(255,255,255,0)',
        ]}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.divider}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  halo: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 320,
    height: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    position: 'relative',
  },
  avatarIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  eyebrowLv: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: tokens.brand.violet2,
    textTransform: 'uppercase',
  },
  eyebrowDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: tokens.text.faint,
  },
  eyebrowTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: tokens.semantic.coinLight,
    flexShrink: 1,
  },
  name: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    lineHeight: 29,
    letterSpacing: -0.3,
    color: tokens.text.hi,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginTop: 18,
    marginHorizontal: -20,
  },
});
