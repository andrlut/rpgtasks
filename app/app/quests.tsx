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

import { QuestCard } from '@/components/QuestCard';
import { QuestTemplateCard } from '@/components/QuestTemplateCard';
import {
  useAbandonQuest,
  useCompleteQuest,
  useQuestTemplates,
  useQuests,
  useStartQuestFromTemplate,
} from '@/lib/api/quests';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';

export default function QuestBoardScreen() {
  const router = useRouter();
  const quests = useQuests();
  const templates = useQuestTemplates();
  const startTemplate = useStartQuestFromTemplate();
  const completeQuest = useCompleteQuest();
  const abandonQuest = useAbandonQuest();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { active, others } = useMemo(() => {
    const all = quests.data ?? [];
    return {
      active: all.filter((q) => q.quest.status === 'active'),
      others: all.filter((q) => q.quest.status !== 'active').slice(0, 5),
    };
  }, [quests.data]);

  // Templates the user already has an active or recent copy of —
  // dim them so the user knows.
  const activeTemplateIds = useMemo(() => {
    const set = new Set<string>();
    (quests.data ?? []).forEach((q) => {
      if (q.quest.template_id && q.quest.status === 'active') {
        set.add(q.quest.template_id);
      }
    });
    return set;
  }, [quests.data]);

  const handleStart = async (templateId: string) => {
    setBusyId(templateId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await startTemplate.mutateAsync(templateId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
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
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not claim', msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleAbandon = async (questId: string, title: string) => {
    const ok = await confirmAction(
      'Abandon quest?',
      `"${title}" will be marked as abandoned. No reward.`,
      { okText: 'Abandon', cancelText: 'Keep it', destructive: true },
    );
    if (!ok) return;
    setBusyId(questId);
    try {
      await abandonQuest.mutateAsync(questId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not abandon', msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={tokens.text.hi} />
        </Pressable>
        <Text style={styles.headerTitle}>Quest Board</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={quests.isRefetching || templates.isRefetching}
            onRefresh={() => {
              quests.refetch();
              templates.refetch();
            }}
            tintColor={tokens.brand.violet2}
          />
        }
      >
        <Text style={styles.tagline}>
          Pick something hard. Claim a reward. Or set your own.
        </Text>

        {/* Active quests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your active quests</Text>
          {active.length > 0 && (
            <Text style={styles.sectionMeta}>{active.length}</Text>
          )}
        </View>

        {quests.isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : active.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="trophy-outline" size={36} color={tokens.text.dim} />
            <Text style={styles.emptyTitle}>No active quests</Text>
            <Text style={styles.emptySub}>
              Tap a template below to take one on.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {active.map((q) => (
              <QuestCard
                key={q.quest.id}
                data={q}
                onClaim={() => handleClaim(q.quest.id)}
                onAbandon={
                  busyId !== q.quest.id
                    ? () => handleAbandon(q.quest.id, q.quest.title)
                    : undefined
                }
              />
            ))}
          </View>
        )}

        {/* Templates */}
        <View style={[styles.sectionHeader, { marginTop: tokens.space[6] }]}>
          <Text style={styles.sectionTitle}>Quest Board</Text>
          <Text style={styles.sectionMeta}>tap to take on</Text>
        </View>

        {templates.isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : (
          <View style={styles.list}>
            {(templates.data ?? []).map((t) => (
              <View
                key={t.id}
                style={
                  activeTemplateIds.has(t.id) ? styles.templateAlreadyActive : undefined
                }
              >
                <QuestTemplateCard
                  template={t}
                  onStart={() => handleStart(t.id)}
                  isStarting={busyId === t.id}
                />
                {activeTemplateIds.has(t.id) && (
                  <Text style={styles.alreadyActiveLabel}>Already active</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Recent history */}
        {others.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: tokens.space[6] }]}>
              <Text style={styles.sectionTitle}>Recently finished</Text>
            </View>
            <View style={styles.list}>
              {others.map((q) => (
                <QuestCard key={q.quest.id} data={q} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  headerTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[10],
    gap: tokens.space[2],
  },
  tagline: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: tokens.space[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[3],
    marginBottom: tokens.space[3],
  },
  sectionTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  sectionMeta: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: tokens.space[3],
  },
  loadingBox: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
  },
  emptyBox: {
    paddingVertical: tokens.space[6],
    alignItems: 'center',
    gap: tokens.space[2],
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
    marginTop: tokens.space[2],
  },
  emptySub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[6],
  },
  templateAlreadyActive: {
    opacity: 0.5,
  },
  alreadyActiveLabel: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
