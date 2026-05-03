import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestTemplate } from '@/lib/db/types';
import { tokens } from '@/theme';
import { getQuestCategoryMeta } from '@/theme/quests';

import { CoinIcon } from './CoinIcon';

interface Props {
  template: QuestTemplate;
  onStart: () => void;
  isStarting?: boolean;
}

export function QuestTemplateCard({ template, onStart, isStarting }: Props) {
  const cat = getQuestCategoryMeta(template.category);
  return (
    <Pressable
      onPress={onStart}
      disabled={isStarting}
      style={({ pressed }) => [
        styles.container,
        (pressed || isStarting) && styles.containerPressed,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: cat.bg }]}>
          <Ionicons name={cat.icon as never} size={18} color={cat.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.title} numberOfLines={1}>
            {template.title}
          </Text>
          <Text style={[styles.eyebrow, { color: cat.color }]}>
            {cat.label.toUpperCase()} · {template.suggested_duration_days}D
          </Text>
        </View>
        <View
          style={[
            styles.startBadge,
            {
              borderColor: cat.color,
              shadowColor: cat.color,
            },
          ]}
        >
          <Ionicons name="play" size={14} color={cat.color} />
        </View>
      </View>

      {template.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {template.description}
        </Text>
      ) : null}

      <View style={styles.rewardRow}>
        <View style={styles.rewardItem}>
          <Ionicons name="flash" size={12} color={tokens.semantic.xp} />
          <Text style={[styles.rewardText, { color: tokens.semantic.xp }]}>
            +{template.reward_xp}
          </Text>
        </View>
        <View style={styles.rewardItem}>
          <CoinIcon size={12} />
          <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
            +{template.reward_coins}
          </Text>
        </View>
        {template.allow_partial && (
          <View style={styles.partialBadge}>
            <Text style={styles.partialText}>partial OK</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.lg,
    padding: tokens.space[4],
    gap: tokens.space[3],
    opacity: 0.92,
  },
  containerPressed: {
    opacity: 1,
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  eyebrow: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  startBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  description: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  partialBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.surface2,
  },
  partialText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 10,
  },
});
