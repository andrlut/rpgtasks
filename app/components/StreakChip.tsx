import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

interface Props {
  days: number;
  doneToday: boolean;
  multiplier?: number;
}

export function StreakChip({ days, doneToday, multiplier = 1 }: Props) {
  const isDormant = days === 0;
  const showBonus = multiplier > 1;
  const bonusPct = Math.round((multiplier - 1) * 100);
  const flameColor = isDormant
    ? tokens.text.dim
    : doneToday
    ? tokens.semantic.warn
    : tokens.semantic.coin;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDormant
            ? tokens.bg.surface
            : 'rgba(255, 159, 67, 0.1)',
          borderColor: isDormant ? tokens.border.base : 'rgba(255, 159, 67, 0.25)',
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 159, 67, 0.18)' }]}>
        <Ionicons name="flame" size={20} color={flameColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {isDormant ? 'No streak yet' : `${days}-day streak`}
        </Text>
        <Text style={styles.sub}>
          {isDormant
            ? 'Complete a daily quest to start one.'
            : doneToday
            ? 'Today is locked in. Keep going.'
            : 'Complete a daily quest to keep it alive.'}
        </Text>
      </View>
      {showBonus ? (
        <View style={styles.bonusBadge}>
          <Text style={styles.bonusText}>+{bonusPct}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_800ExtraBold',
  },
  sub: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: 2,
  },
  bonusBadge: {
    paddingHorizontal: tokens.space[2],
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(255, 159, 67, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.35)',
  },
  bonusText: {
    ...tokens.type.caption,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_800ExtraBold',
  },
});
