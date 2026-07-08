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
import { LimitCounterBadge } from '@/components/premium/LimitCounterBadge';
import {
  useCompleteQuest,
  useQuestTemplates,
  useQuests,
  useStartQuestFromTemplate,
} from '@/lib/api/quests';
import { useT } from '@/lib/i18n';
import { freeLimitEntity, useLimitModalStore, useQuestLimit } from '@/lib/premium';
import { TourModule } from '@/components/tour/TourModule';
import { emitTourEvent } from '@/lib/tour/eventBus';
import { buildM3Steps, M3_EVENTS } from '@/lib/tour/m3Steps';
import { useIsCurrentTourModule } from '@/lib/tour/store';
import type { QuestTemplate, QuestWithProgress } from '@/lib/db/types';
import { showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { QUEST_CATEGORY_ORDER, getQuestCategoryMeta } from '@/theme/quests';

/**
 * Missões — list of all `accumulate_sub_stars` templates + the user's
 * in-flight sub_stars quests. /goals handles every other quest kind.
 *
 * Layout: "Em andamento" section (active, sorted by deadline ASC) above
 * an "Inativas" section (templates grouped by sub category in canonical
 * order). The two sections are independent — adding/finishing a goal
 * doesn't reshuffle inactive cards.
 */
export default function QuestBoardScreen() {
  const router = useRouter();
  const { t } = useT();
  const quests = useQuests();
  const templates = useQuestTemplates();
  const startTemplate = useStartQuestFromTemplate();
  const completeQuest = useCompleteQuest();
  const bottomClearance = useBottomNavClearance();
  const [busyId, setBusyId] = useState<string | null>(null);
  const isM3Current = useIsCurrentTourModule('M3');

  // ── Sub_stars filter ──────────────────────────────────────────────────
  // Missões = quests/templates whose requirements include accumulate_sub_stars.
  const active = useMemo(
    () =>
      (quests.data ?? []).filter(
        (q) =>
          q.quest.status === 'active' &&
          q.requirements.some((r) => r.requirement.kind === 'accumulate_sub_stars'),
      ),
    [quests.data],
  );

  /** template_id → active quest using that template (for dimming). */
  const activeByTemplateId = useMemo(() => {
    const map = new Map<string, QuestWithProgress>();
    for (const q of active) {
      if (q.quest.template_id) map.set(q.quest.template_id, q);
    }
    return map;
  }, [active]);

  /** Templates the user hasn't started — sub_stars only. */
  const inactiveTemplates = useMemo(
    () =>
      (templates.data ?? []).filter(
        (tmpl) =>
          !activeByTemplateId.has(tmpl.id) &&
          tmpl.requirements.some((r) => r.kind === 'accumulate_sub_stars'),
      ),
    [templates.data, activeByTemplateId],
  );

  // ── Sections ───────────────────────────────────────────────────────────
  const activeSorted = useMemo(
    () =>
      [...active].sort((a, b) => {
        const da = new Date(a.quest.deadline).getTime();
        const db = new Date(b.quest.deadline).getTime();
        return da - db; // soonest deadline first
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
        'Unknown error';
      showInfo(t('quests.errStart'), msg);
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
        t('quests.completeTitle'),
        t('quests.completeBody', {
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
        'Unknown error';
      showInfo(t('quests.errClaim'), msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleInactiveLongPress = (templateId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    emitTourEvent(M3_EVENTS.QUEST_DETAIL_OPENED);
    router.push({
      pathname: '/quest-detail/[id]',
      params: { id: templateId, kind: 'template' },
    });
  };

  const handleActiveLongPress = (q: QuestWithProgress) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    emitTourEvent(M3_EVENTS.QUEST_DETAIL_OPENED);
    router.push({
      pathname: '/quest-detail/[id]',
      params: { id: q.quest.id, kind: 'quest' },
    });
  };

  const questLimit = useQuestLimit();
  const openLimit = useLimitModalStore((s) => s.open);
  const handleCreateCustom = () => {
    if (questLimit.atLimit) {
      openLimit('quest');
      return;
    }
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
          <Text style={styles.headerTitle}>{t('quests.board.title')}</Text>
          {inactiveTemplates.length > 0 && (
            <Text style={styles.headerSubtitle}>{t('quests.board.subtitle')}</Text>
          )}
        </View>
        <View style={styles.activeChip}>
          <Text style={styles.activeChipText}>
            {t('quests.board.activeChip', { count: totalActiveCount })}
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
            {/* ── Active section ────────────────────────────────────── */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>
                {t('quests.board.activeSection')}
              </Text>
              {activeSorted.length === 0 ? (
                <View style={styles.emptyActive}>
                  <Ionicons
                    name="flag-outline"
                    size={28}
                    color={tokens.text.dim}
                  />
                  <Text style={styles.emptyText}>{t('quests.empty')}</Text>
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

            {/* ── Inactive section ──────────────────────────────────── */}
            {inactiveSections.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionHeading}>
                  {t('quests.board.inactiveSection')}
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
                            // Surface the "press and hold" hint during the
                            // M3 tour so the user knows the gesture that
                            // opens the detail (a plain tap would start it).
                            showLongPressHint={isM3Current}
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

        {/* Create custom quest CTA */}
        {!isLoading && (
          <Pressable
            onPress={handleCreateCustom}
            style={({ pressed }) => [
              styles.createBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('quests.board.createCta')}
          >
            <View style={styles.createIcon}>
              <Ionicons name="add" size={14} color={tokens.brand.violet} />
            </View>
            <Text style={styles.createText}>{t('quests.board.createCta')}</Text>
            <LimitCounterBadge limit={questLimit} />
          </Pressable>
        )}
      </ScrollView>

      {/* M3 step 2 lives here — board + available templates. Long-press
         a template fires QUEST_DETAIL_OPENED + opens its detail; tapping
         the tooltip's Próximo / skip opens the first available template
         instead so step 3 has its surface. `flatNav` because this Stack
         screen has no floating BottomNavBar. */}
      <TourModule
        module="M3"
        screen="quests"
        steps={buildM3Steps(t)}
        enabled={isM3Current}
        flatNav
        onAdvanceToNextScreen={() => {
          // handleNext already advanced the step index — this is pure
          // navigation to the surface step 3 lives on.
          const first = inactiveTemplates[0];
          if (first) {
            router.push({
              pathname: '/quest-detail/[id]',
              params: { id: first.id, kind: 'template' },
            });
          }
        }}
      />
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
    backgroundColor: 'rgba(123,92,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.3)',
  },
  activeChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.brand.violet2,
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
  /**
   * Tiny divider between the two sections so the visual break reads
   * even when active+inactive sit close together (small phones / few
   * cards). Matches the existing border tokens.
   */
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
