import { Ionicons } from '@expo/vector-icons';
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
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLevel}>{level}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.subline}>
          {xpInLevel} / {xpNeededForLevel} XP to LV {level + 1}
        </Text>
        <View style={{ marginTop: tokens.space[2] }}>
          <ProgressBar value={xpInLevel} max={xpNeededForLevel} color={tokens.brand.violet} />
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.coinPill}>
            <Ionicons name="ellipse" size={12} color={tokens.semantic.coin} />
            <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
          </View>
          <Text style={styles.xpTotal}>{totalXp.toLocaleString()} XP total</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    padding: tokens.space[4],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.border.base,
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
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[2],
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 200, 61, 0.12)',
    borderRadius: tokens.radius.pill,
  },
  coinText: {
    ...tokens.type.caption,
    color: tokens.semantic.coin,
  },
  xpTotal: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
});
