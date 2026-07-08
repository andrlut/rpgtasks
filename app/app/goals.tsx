import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBottomNavClearance } from '@/components/BottomNavBar';
import { CategoryHeader } from '@/components/CategoryHeader';
import { QuestCard } from '@/components/QuestCard';
import {
  useCompleteQuest,
  useQuestTemplates,
  useQuests,
  useStartQuestFromTemplate,
} from '@/lib/api/quests';
import { useT } from '@/lib/i18n';
import type { QuestTemplate, QuestWithProgress } from '@/lib/db/types';
import { freeLimitEntity } from '@/lib/premium';
import { showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { QUEST_CATEGORY_ORDER, getQuestCategoryMeta } from '@/theme/quests';

/**
 * Metas (Goals) — list of every available template + the user's in-flight
 * quests whose requirements do NOT include `accumulate_sub_stars`. That's
 * the "where I want to get to" board — skill targets, task counts,
 * dimension challenges. /quests (Missões) handles sub_stars instead.
 *
 * Layout mirrors /quests: an "In progress" section sorted by deadline ASC
 * above an "Inactive" section grouped by category in canonical order.
 */
export default function GoalsBoardScreen() {
  const router = useRouter();
  const { t } = useT();
  const quests = useQuests();
  const templates = useQuestTemplates();
  const startTemplate = useStartQuestFromTemplate();
  const completeQuest = useCompleteQuest();
  const bottomClearance = useBottomNavClearance();
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── Non-sub_stars filter ──────────────────────────────────────────────
  const active = useMemo(
    () =>
      (quests.data ?? []).filter(
        (q) =>
          q.quest.status === 'active' &&
          q.requirements.every(
            (r) => r.requirement.kind !== 'accumulate_sub_stars',
          ),
      ),
    [quests.data],
  );

  const activeByTemplateId = useMemo(() => {
    const map = new Map<string, QuestWithProgress>();
    for (const q of active) {
      if (q.quest.template_id) map.set(q.quest.template_id, q);
    }
    return map;
  }, [active]);

  const inactiveTemplates = useMemo(
    () =>
      (templates.data ?? []).filter(
        (tmpl) =>
          !activeByTemplateId.has(tmpl.id) &&
          tmpl.requirements.every((r) => r.kind !== 'accumulate_sub_stars'),
      ),
    [templates.data, activeByTemplateId],
  );

  // ── Sections ───────────────────────────────────────────────────────────
  const activeSorted = useMemo(
    () =>
      [...active].sort((a, b) => {
        const da = new Date(a.quest.deadline).getTime();
        const db = new Date(b.quest.deadline).getTime();
        return da - db;
      }),
    [active],
  );

  const inactiveSections = useMemo(() => {
    const map = new Map<string, QuestTemplate[]>();
    for (const tmpl of inactiveTemplates) {
      const slot = map.get(tmpl.category) ?? [];
      slot.push(tmpl);
      map.set(tmpl.category, slot);
    }
    const knownOrder = QUEST_CATEGORY_ORDER.filter((c) => map.has(c));
    const unknown = [...map.keys()]
      .filter((c) => !QUEST_CATEGORY_ORDER.includes(c))
      .sort();
    return [...knownOrder, ...unknown].map((cat) => ({
      cat,
      templates: map.get(cat)!,
    }));
  }, [inactiveTemplates]);

  const totalActiveCount = activeSorted.length;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleStart = async (templateId: string) => {
    setBusyId(templateId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await startTemplate.mutateAsync(templateId);
    } catch (e) {
      if (freeLimitEntity(e)) return; // limit modal handled globally
      const err = e as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
      };
      console.error('[start_quest_from_template] failed', err);
      const msg =
        [err.message, err.code, err.details, err.hint].filter(Boolean).join('\n') ||
        t('common.unknownError');
      showInfo(t('goals.errStart'), msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleClaim = async (questId: string) => {
    setBusyId(questId);
    try {
      const result = await completeQuest.mutateAsync(questId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      showInfo(
        t('goals.completeTitle'),
        t('goals.completeBody', {
          xp: result.reward_xp,
          coins: result.reward_coins,
        }),
      );
    } catch (e) {
      const err = e as {
        message?: string;
        code?: string;
        details?: string;
        hint?: string;
      };
      console.error('[complete_quest] failed', err);
      const msg =
        [err.message, err.code, err.details, err.hint].filter(Boolean).join('\n') ||
        t('common.unknownError');
      showInfo(t('goals.errClaim'), msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleInactiveLongPress = (templateId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/quest-detail/[id]',
      params: { id: templateId, kind: 'template' },
    });
  };

  const handleActiveLongPress = (q: QuestWithProgress) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/quest-detail/[id]',
      params: { id: q.quest.id, kind: 'quest' },
    });
  };

  const handleCreateCustom = () => {
    router.push('/quest-create');
  };

  // ── Render ─────────────────────────────────────────────────────────────
  const isLoading = quests.isLoading || templates.isLoading;
  const refreshing = quests.isRefetching || templates.isRefetching;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={16} color={tokens.text.mid} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{t('goals.board.title')}</Text>
          {inactiveTemplates.length > 0 && (
            <Text style={styles.headerSubtitle}>{t('goals.board.subtitle')}</Text>
          )}
        </View>
        <View style={styles.activeChip}>
          <Text style={styles.activeChipText}>
            {t('goals.board.activeChip', { count: totalActiveCount })}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              quests.refetch();
              templates.refetch();
            }}
            tintColor={tokens.brand.violet2}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>
                {t('goals.board.activeSection')}
              </Text>
              {activeSorted.length === 0 ? (
                <View style={styles.emptyActive}>
                  <Ionicons
                    name="flag-outline"
                    size={28}
                    color={tokens.text.dim}
                  />
                  <Text style={styles.emptyText}>{t('goals.empty')}</Text>
                </View>
              ) : (
                <View style={styles.cardsList}>
                  {activeSorted.map((q) => (
                    <QuestCard
                      key={`active-${q.quest.id}`}
                      variant="active"
                      data={q}
                      onLongPress={() => handleActiveLongPress(q)}
                      onClaim={() => handleClaim(q.quest.id)}
                      isClaiming={busyId === q.quest.id}
                    />
                  ))}
                </View>
              )}
            </View>

            {inactiveSections.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionHeading}>
                  {t('goals.board.inactiveSection')}
                </Text>
                {inactiveSections.map(({ cat, templates: catTemplates }) => {
                  const meta = getQuestCategoryMeta(cat);
                  return (
                    <View key={cat} style={styles.categoryGroup}>
                      <CategoryHeader
                        label={meta.label}
                        color={meta.color}
                        count={catTemplates.length}
                      />
                      <View style={styles.cardsList}>
                        {catTemplates.map((tmpl) => (
                          <QuestCard
                            key={`tmpl-${tmpl.id}`}
                            variant="inactive"
                            template={tmpl}
                            onStart={() => handleStart(tmpl.id)}
                            onLongPress={() => handleInactiveLongPress(tmpl.id)}
                            isStarting={busyId === tmpl.id}
                            showLongPressHint={false}
                          />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {!isLoading && (
          <Pressable
            onPress={handleCreateCustom}
            style={({ pressed }) => [
              styles.createBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('goals.board.createCta')}
          >
            <View style={styles.createIcon}>
              <Ionicons name="add" size={14} color={tokens.brand.violet} />
            </View>
            <Text style={styles.createText}>{t('goals.board.createCta')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  headerSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 9,
    color: tokens.text.faint,
    marginTop: 1,
  },
  activeChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,200,61,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,61,0.30)',
  },
  activeChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.semantic.coin,
  },
  scroll: {
    paddingHorizontal: tokens.space[2],
    paddingTop: tokens.space[2],
  },
  loading: {
    paddingVertical: tokens.space[10],
    alignItems: 'center',
  },
  emptyActive: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  emptyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.dim,
    textAlign: 'center',
    paddingHorizontal: tokens.space[5],
  },
  section: {
    marginBottom: tokens.space[6],
  },
  sectionDivider: {
    height: 1,
    backgroundColor: tokens.border.base,
    marginHorizontal: tokens.space[2],
    marginBottom: tokens.space[4],
  },
  sectionHeading: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.text.hi,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    paddingHorizontal: tokens.space[2],
    marginBottom: tokens.space[3],
  },
  categoryGroup: {
    marginBottom: tokens.space[1],
  },
  cardsList: {
    gap: 5,
  },
  createBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: tokens.space[3],
    paddingVertical: tokens.space[3] + 1,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.border.strong,
    borderRadius: tokens.radius.md,
  },
  createIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: 'rgba(123, 92, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.text.dim,
  },
});
