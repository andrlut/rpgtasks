import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

interface Props {
  xp: number;
  completed: number;
  skipped: number;
}

/**
 * Day-summary card for the History screen. Single gradient surface
 * (same vocabulary as the home XPStatsCard) carrying three inline
 * stat blocks: XP earned · tasks completed · tasks skipped. Each
 * block has a colored value + glyph + label so it reads at a
 * glance without legend.
 *
 * Replaces the old 3-card row (XP / tasks / coins). Coins dropped:
 * day-level coins were redundant with completion counts since
 * coins == XP in the current model.
 */
export function DayStatsCard({ xp, completed, skipped }: Props) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={tokens.gradient.todayHero}
        locations={tokens.gradient.todayHeroLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.border} pointerEvents="none" />

      <View style={styles.row}>
        <StatBlock
          icon="flash"
          value={xp}
          label="XP"
          color={tokens.semantic.xp}
        />
        <View style={styles.divider} />
        <StatBlock
          icon="checkmark-circle"
          value={completed}
          label="Done"
          color={tokens.brand.violet2}
        />
        <View style={styles.divider} />
        <StatBlock
          icon="play-skip-forward"
          value={skipped}
          label="Skipped"
          color={tokens.semantic.coin}
        />
      </View>
    </View>
  );
}

interface StatBlockProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
}

function StatBlock({ icon, value, label, color }: StatBlockProps) {
  return (
    <View style={styles.block}>
      <View style={styles.valueRow}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.value, { color }]}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    marginBottom: tokens.space[4],
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    ...tokens.shadow.deep,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderTopColor: 'rgba(155, 130, 255, 0.22)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  block: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: tokens.border.divider,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 19,
    letterSpacing: -0.2,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    color: tokens.text.mid,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
