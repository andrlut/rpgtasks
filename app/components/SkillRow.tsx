import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SkillState } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

import { ProgressBar } from './ProgressBar';
import { TierMedal } from './TierMedal';

interface Props {
  state: SkillState;
  onPress: () => void;
}

export function SkillRow({ state, onPress }: Props) {
  const { skill, currentPr, currentTier, nextTier } = state;
  const dim = DIMENSION_META[skill.dimension_id];

  const progressMin = currentTier.threshold;
  const progressMax = nextTier ? nextTier.threshold : currentTier.threshold;
  const progressVal = currentPr - progressMin;
  const progressNeeded = Math.max(1, progressMax - progressMin);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && { opacity: 0.7 }]}
    >
      <TierMedal tier={currentTier.tier_name} size={44} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.iconWithTitle}>
            <Ionicons name={skill.icon as never} size={14} color={dim.color} />
            <Text style={styles.title}>{skill.display_name}</Text>
          </View>
        </View>
        <Text style={styles.bigValue}>
          <Text style={styles.bigValueNum}>{currentPr}</Text>
          <Text style={styles.bigValueUnit}> {skill.unit}</Text>
        </Text>
        <View style={{ marginTop: 6 }}>
          <ProgressBar
            value={progressVal}
            max={progressNeeded}
            color={tokens.semantic.coin}
            height={4}
          />
        </View>
        {nextTier && (
          <Text style={styles.subtitle}>
            {Math.max(0, nextTier.threshold - currentPr)} to {nextTier.tier_name}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={tokens.text.dim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
  iconWithTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  title: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    flexShrink: 1,
  },
  bigValue: {
    marginTop: 4,
    marginBottom: 6,
  },
  bigValueNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: tokens.text.hi,
  },
  bigValueUnit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.mid,
  },
  subtitle: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    marginTop: 4,
  },
});
