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
import { showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { QUEST_CATEGORY_ORDER, getQuestCategoryMeta } from '@/theme/quests';

/**
 * Quest Board — list of every available template + the user's in-flight
 * quests, grouped by category. Active and inactive cards interleave in
 * each category section so the user sees what they're doing in context
 * with what's still on offer.
 *
 * Long-press wiring is a stub until the detail screen lands (Phase 2 of
 * the redesign): tapping the play badge starts the quest; long-press
 * on an active card opens an abandon confirmation.
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

  // ── Derived ────────────────────────────────────────────────────────────
  const active = useMemo(
    () => (quests.data ?? []).filter((q) => q.quest.status === 'active'),
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

  /** Templates the user hasn't started (or that don't dedupe to an active row). */
  const inactiveTemplates = useMemo(
    () => (templates.data ?? []).filter((tmpl) => !activeByTemplateId.has(tmpl.id)),
    [templates.data, activeByTemplateId],
  );

  /** Bucketed by category for rendering. */
  const sections = useMemo(() => {
    const map = new Map<
      string,
      { actives: QuestWithProgress[]; templates: QuestTemplate[] }
    >();
    for (const q of active) {
      // Active quests don't carry category — resolve via the linked template
      // when available; otherwise drop into a synthetic "custom" bucket.
      const tmpl = (templates.data ?? []).find((t) => t.id === q.quest.template_id);
      const cat = tmpl?.category ?? 'custom';
      const slot = map.get(cat) ?? { actives: [], templates: [] };
      slot.actives.push(q);
      map.set(cat, slot);
    }
    for (const tmpl of inactiveTemplates) {
      const slot = map.get(tmpl.category) ?? { actives: [], templates: [] };
      slot.templates.push(tmpl);
      map.set(tmpl.category, slot);
    }
    // Order: predefined categories first, then any unknown ones alphabetically.
    const knownOrder = QUEST_CATEGORY_ORDER.filter((c) => map.has(c));
    const unknown = [...map.keys()]
      .filter((c) => !QUEST_CATEGORY_ORDER.includes(c))
      .sort();
    return [...knownOrder, ...unknown].map((cat) => ({
      cat,
      ...map.get(cat)!,
    }));
  }, [active, inactiveTemplates, templates.data]);

  const totalActiveCount = active.length;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleStart = async (templateId: string) => {
    setBusyId(templateId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await startTemplate.mutateAsync(templateId);
    } catch (e) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      console.error('[start_quest_from_template] failed', err);
      const msg =
        [err.message, err.code, err.details, err.hint].filter(Boolean).join('\n') ||
        'Unknown error';
      showInfo('Could not start quest', msg);
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
        'Quest complete!',
        `+${result.reward_xp} XP and +${result.reward_coins} coins.`,
      );
    } catch (e) {
      const err = e as { message?: string; code?: string; details?: string; hint?: string };
      console.error('[complete_quest] failed', err);
      const msg =
        [err.message, err.code, err.details, err.hint].filter(Boolean).join('\n') ||
        'Unknown error';
      showInfo('Could not claim', msg);
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
          accessibilityLabel="Close"
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
        ) : sections.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={36} color={tokens.text.dim} />
            <Text style={styles.emptyText}>{t('quests.empty')}</Text>
          </View>
        ) : (
          sections.map(({ cat, actives, templates: catTemplates }) => {
            const meta = getQuestCategoryMeta(cat);
            const totalInSection = actives.length + catTemplates.length;
            if (totalInSection === 0) return null;
            return (
              <View key={cat} style={styles.section}>
                <CategoryHeader
                  label={meta.label}
                  color={meta.color}
                  count={totalInSection}
                />
                <View style={styles.cardsList}>
                  {actives.map((q) => (
                    <QuestCard
                      key={`active-${q.quest.id}`}
                      variant="active"
                      data={q}
                      onLongPress={() => handleActiveLongPress(q)}
                      onClaim={() => handleClaim(q.quest.id)}
                      isClaiming={busyId === q.quest.id}
                    />
                  ))}
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
          })
        )}

        {/* Create custom quest CTA */}
        {!isLoading && (
          <Pressable
            onPress={handleCreateCustom}
            style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('quests.board.createCta')}
          >
            <View style={styles.createIcon}>
              <Ionicons name="add" size={14} color={tokens.brand.violet} />
            </View>
            <Text style={styles.createText}>{t('quests.board.createCta')}</Text>
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
  empty: {
    paddingVertical: tokens.space[10],
    alignItems: 'center',
    gap: tokens.space[3],
  },
  emptyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.dim,
    textAlign: 'center',
    paddingHorizontal: tokens.space[5],
  },
  section: {
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
