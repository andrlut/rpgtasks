import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SkillState } from '@/lib/db/types';
import { tokens } from '@/theme';
import { DIMENSION_META } from '@/theme/dimensions';

import { ProgressBar } from './ProgressBar';
import { TierBadge } from './TierBadge';

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
      <View style={[styles.iconWrap, { backgroundColor: dim.bg }]}>
        <Ionicons name={skill.icon as never} size={20} color={dim.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{skill.display_name}</Text>
          <TierBadge tier={currentTier.tier_name} size="sm" />
        </View>
        <Text style={styles.subtitle}>
          {currentPr} {skill.unit}
          {nextTier ? ` · ${Math.max(0, nextTier.threshold - currentPr)} ${skill.unit} to next tier` : ' · max tier'}
        </Text>
        <View style={{ marginTop: 6 }}>
          <ProgressBar
            value={progressVal}
            max={progressNeeded}
            color={dim.color}
            height={4}
          />
        </View>
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  title: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
    flexShrink: 1,
  },
  subtitle: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: 2,
  },
});
