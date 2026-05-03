import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { levelProgress } from '@/lib/xp';
import { tokens } from '@/theme';

import { LevelRing } from './LevelRing';
import { ProgressBar } from './ProgressBar';

interface Props {
  displayName: string;
  totalXp: number;
  coins: number;
  streakDays?: number;
}

export function HeroCard({ displayName, totalXp, coins, streakDays = 0 }: Props) {
  const { level, xpInLevel, xpNeededForLevel } = levelProgress(totalXp);
  const progress = xpNeededForLevel === 0 ? 0 : xpInLevel / xpNeededForLevel;

  return (
    <View style={styles.outer}>
      <LinearGradient
        colors={tokens.gradient.heroCard}
        locations={tokens.gradient.heroCardLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.avatarSlot}>
          <LevelRing size={72} level={level} progress={progress}>
            <Ionicons name="person" size={36} color={tokens.brand.violet2} />
          </LevelRing>
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
            {streakDays > 0 ? (
              <View style={styles.streakChip}>
                <Ionicons name="flame" size={13} color={tokens.semantic.warn} />
                <Text style={styles.streakText}>{streakDays}d</Text>
              </View>
            ) : (
              <Text style={styles.xpTotal}>{totalXp.toLocaleString()} XP total</Text>
            )}
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
  avatarSlot: {
    width: 80,
    height: 92,
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 3,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255, 159, 67, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.35)',
  },
  streakText: {
    ...tokens.type.caption,
    color: tokens.semantic.warn,
    fontFamily: 'Manrope_800ExtraBold',
  },
});
