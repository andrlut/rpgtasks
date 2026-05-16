import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LearningFeedCard } from '@/lib/api/learning';
import { tokens } from '@/theme';

import { CoverCard } from './CoverCard';

/**
 * A Netflix/Headway-style horizontal carousel. Section header + horizontal
 * scroll of CoverCards. Empty rows are dropped by the parent (don't pass
 * them in).
 */

interface Props {
  title: string;
  /** Optional small icon shown beside the header text. */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Optional accent color for the icon + a faint left-bar on the header. */
  accentColor?: string;
  cards: LearningFeedCard[];
  readSet: Set<string>;
  onCardPress: (card: LearningFeedCard) => void;
  /** Optional small count shown next to the title (e.g. "12"). */
  count?: number;
}

export function CarouselRow({
  title,
  iconName,
  accentColor,
  cards,
  readSet,
  onCardPress,
  count,
}: Props) {
  if (cards.length === 0) return null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {iconName && (
          <View style={[styles.iconWrap, { backgroundColor: (accentColor ?? tokens.brand.violet2) + '22' }]}>
            <Ionicons
              name={iconName}
              size={14}
              color={accentColor ?? tokens.brand.violet2}
            />
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
        {count !== undefined && (
          <Text style={styles.count}>{count}</Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {cards.map((card) => (
          <CoverCard
            key={card.id}
            card={card}
            read={readSet.has(card.id)}
            onPress={onCardPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: tokens.space[5],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[4],
    marginBottom: 10,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.text.hi,
    letterSpacing: 0.2,
  },
  count: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
    backgroundColor: tokens.bg.glass,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  scroll: {
    paddingHorizontal: tokens.space[4],
    gap: 12,
  },
});
