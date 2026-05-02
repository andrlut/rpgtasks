import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';

import { ProgressBar } from './ProgressBar';

interface Props {
  displayName: string;
  totalXp: number;
  coins: number;
}

export function HeroCard({ displayName, totalXp, coins }: Props) {
  const { level, xpInLevel, xpNeededForLevel } = levelProgress(totalXp);

  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={tokens.gradient.heroCard}
        locations={tokens.gradient.heroCardLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatarGlow} />
          <View style={styles.avatar}>
            <Text style={styles.avatarLevel}>{level}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.subline}>
            {xpInLevel} / {xpNeededForLevel} XP to LV {level + 1}
          </Text>
          <View style={styles.barWrap}>
            <ProgressBar
              value={xpInLevel}
              max={xpNeededForLevel}
              color={tokens.brand.violet}
              height={7}
            />
          </View>
          <View style={styles.bottomRow}>
            <LinearGradient
              colors={tokens.gradient.coinPill}
              locations={tokens.gradient.coinPillLocations}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coinPill}
            >
              <Ionicons name="ellipse" size={11} color="#3D2A00" />
              <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
            </LinearGradient>
            <Text style={styles.xpTotal}>{totalXp.toLocaleString()} XP total</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: tokens.radius.xl,
    ...tokens.shadow.deep,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    padding: tokens.space[4],
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    overflow: 'hidden',
  },
  avatarWrap: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: tokens.brand.violet,
    opacity: 0.35,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.brand.violetDeep,
    borderWidth: 2,
    borderColor: tokens.brand.violet2,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.violetGlowSoft,
  },
  avatarLevel: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  subline: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: 2,
  },
  barWrap: {
    marginTop: tokens.space[2],
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[3],
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    ...tokens.shadow.coinGlowSoft,
  },
  coinText: {
    ...tokens.type.caption,
    color: '#3D2A00',
    fontFamily: 'Manrope_800ExtraBold',
  },
  xpTotal: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
});
