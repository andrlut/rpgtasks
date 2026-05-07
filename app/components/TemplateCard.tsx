import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { RewardTemplate } from '@/lib/db/types';
import { useLocalizedPick } from '@/lib/i18n/catalog';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

import { CoinIcon } from './CoinIcon';

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
      style={({ pressed }) => [
        styles.container,
        (pressed || isAdding) && styles.containerPressed,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: cat.bg }]}>
        <Ionicons name={template.icon as never} size={20} color={cat.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        <View style={styles.costRow}>
          <CoinIcon size={12} />
          <Text style={styles.cost}>{template.cost.toLocaleString()}</Text>
        </View>
      </View>
      <View
        style={[
          styles.addButton,
          {
            borderColor: cat.color,
            shadowColor: cat.color,
          },
        ]}
      >
        <Ionicons name="add" size={20} color={cat.color} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  containerPressed: {
    opacity: 1,
    transform: [{ scale: 0.98 }],
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
  subtitle: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cost: {
    ...tokens.type.caption,
    color: tokens.semantic.coin,
    fontFamily: 'Manrope_700Bold',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
});
