import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { useQuests } from '@/lib/api/quests';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

/**
 * Sum-of-fractions aggregate progress across a quest's requirements.
 * Each requirement contributes `min(1, current/target)`; average across
 * all requirements is the displayed bar width.
 */
function aggregateProgress(reqs: {
  requirement: { kind: string; target_count: number | null; min_value: number | null };
  currentCount: number;
}[]): number {
  if (reqs.length === 0) return 0;
  let sum = 0;
  for (const r of reqs) {
    const target =
      r.requirement.kind === 'reach_skill_value'
        ? Number(r.requirement.min_value ?? 0)
        : Number(r.requirement.target_count ?? 0);
    if (target <= 0) continue;
    sum += Math.min(1, r.currentCount / target);
  }
  return sum / reqs.length;
}

/**
 * Active-quests pill rendered between the Today ring and the bucket tabs.
 * Always visible — even when the user has no active quests, the card
 * serves as a discovery surface inviting them to browse / start one.
 *
 * Header has a chevron toggle that collapses the body (list or empty
 * message) with a layout animation. The "Browse quests" CTA at the
 * bottom is always visible, regardless of collapse state, so the
 * navigation affordance is never hidden.
 */
export function ActiveQuestsCard() {
  const router = useRouter();
  const { t } = useT();
  const quests = useQuests();
  const [open, setOpen] = useState(true);

  const active = (quests.data ?? []).filter((q) => q.quest.status === 'active');
  const goToQuests = () => router.push('/quests');
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.headerRow, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={open ? t('home.quests.collapse') : t('home.quests.expand')}
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.label}>
          ⚔ {t('home.quests.label')} · {active.length}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.brand.violet2}
        />
      </Pressable>

      {open &&
        (active.length === 0 ? (
          <Text style={styles.emptyText}>{t('home.quests.empty')}</Text>
        ) : (
          <View style={styles.body}>
            {active.map((q) => {
              const pct = aggregateProgress(q.requirements);
              const completed = q.requirements.filter((r) => r.isMet).length;
              return (
                <Pressable
                  key={q.quest.id}
                  onPress={goToQuests}
                  style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Open quest ${q.quest.title}`}
                >
                  <View style={styles.itemIcon}>
                    <Ionicons name="star" size={13} color={tokens.semantic.coin} />
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {q.quest.title}
                    </Text>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.round(pct * 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.itemProgress}>
                      {completed} / {q.requirements.length}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

      <Pressable
        onPress={goToQuests}
        style={({ pressed }) => [styles.browseRow, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={t('home.quests.browseCta')}
      >
        <Text style={styles.browseText}>{t('home.quests.browseCta')}</Text>
        <Ionicons name="chevron-forward" size={12} color={tokens.brand.violet2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: tokens.space[3],
    marginBottom: tokens.space[4],
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.3)',
    borderRadius: tokens.radius.xl,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3] + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.space[2],
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: tokens.brand.violet,
    textTransform: 'uppercase',
    flex: 1,
  },
  emptyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.mid,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: tokens.space[2],
  },
  body: {
    gap: tokens.space[2],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2] + 2,
  },
  itemIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 200, 61, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.hi,
  },
  progressTrack: {
    marginTop: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: tokens.bg.surface3 ?? 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: tokens.semantic.coin,
    borderRadius: 2,
  },
  itemProgress: {
    marginTop: 2,
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.dim,
  },
  browseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: tokens.space[3],
    paddingTop: tokens.space[2] + 2,
    borderTopWidth: 1,
    borderTopColor: tokens.border.base,
  },
  browseText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.5,
    color: tokens.brand.violet2,
    textTransform: 'uppercase',
  },
});
