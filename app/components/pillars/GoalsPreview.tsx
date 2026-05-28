import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QuestCard } from '@/components/QuestCard';
import { useT } from '@/lib/i18n';
import { useQuests } from '@/lib/api/quests';
import type { QuestWithProgress } from '@/lib/db/types';
import { tokens } from '@/theme';

const ACCENT = tokens.semantic.coin;
const TEASER_COUNT = 3;

/**
 * Goals (Metas) preview rendered inside the Identidade Desejada pillar.
 *
 * Shows the user's top {{TEASER_COUNT}} active goals sorted by deadline
 * ASC. If none exist, renders a hero CTA inviting the user to pick one.
 * "View all" always opens /goals.
 *
 * Goals = quest_requirement.kind !== 'accumulate_sub_stars' — sub_stars
 * lives on /quests (Missões) and surfaces from Home, not here.
 */
export function GoalsPreview() {
  const router = useRouter();
  const { t } = useT();
  const quests = useQuests();

  const activeGoals = useMemo<QuestWithProgress[]>(() => {
    const all = (quests.data ?? []).filter(
      (q) =>
        q.quest.status === 'active' &&
        q.requirements.every(
          (r) => r.requirement.kind !== 'accumulate_sub_stars',
        ),
    );
    return all.sort((a, b) => {
      const da = new Date(a.quest.deadline).getTime();
      const db = new Date(b.quest.deadline).getTime();
      return da - db;
    });
  }, [quests.data]);

  const hasGoals = activeGoals.length > 0;
  const teaser = activeGoals.slice(0, TEASER_COUNT);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.iconHalo}>
          <Ionicons name="flag-outline" size={28} color={ACCENT} />
        </View>
        <Text style={styles.eyebrow}>{t('goalsPreview.eyebrow')}</Text>
        <Text style={styles.title}>{t('goalsPreview.title')}</Text>
        {!hasGoals && (
          <Text style={styles.body}>{t('goalsPreview.body')}</Text>
        )}
      </View>

      {hasGoals ? (
        <>
          <View style={styles.teaserList}>
            {teaser.map((q) => (
              <QuestCard
                key={`goal-${q.quest.id}`}
                variant="active"
                data={q}
                onLongPress={() => router.push('/goals')}
              />
            ))}
          </View>
          <Pressable
            onPress={() => router.push('/goals')}
            style={({ pressed }) => [
              styles.allBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('goalsPreview.allCta')}
          >
            <Text style={styles.allBtnText}>
              {t('goalsPreview.allCta')} ·{' '}
              {t('goalsPreview.activeCount', { count: activeGoals.length })}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={ACCENT} />
          </Pressable>
        </>
      ) : (
        <Pressable
          onPress={() => router.push('/goals')}
          style={({ pressed }) => [
            styles.heroCta,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('goalsPreview.empty.cta')}
        >
          <Text style={styles.heroTitle}>{t('goalsPreview.empty.title')}</Text>
          <View style={styles.heroCtaInner}>
            <Text style={styles.heroCtaText}>{t('goalsPreview.empty.cta')}</Text>
            <Ionicons name="arrow-forward" size={14} color={ACCENT} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space[3],
    paddingTop: tokens.space[4],
  },
  header: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[3],
  },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 200, 61, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.mid,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 4,
  },
  teaserList: {
    gap: 5,
  },
  allBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,200,61,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,61,0.18)',
  },
  allBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: ACCENT,
    letterSpacing: 0.3,
  },
  heroCta: {
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,200,61,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,61,0.25)',
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  heroCtaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCtaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: ACCENT,
    letterSpacing: 0.3,
  },
});
