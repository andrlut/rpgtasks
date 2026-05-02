import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeroCard } from '@/components/HeroCard';
import { QuestChip } from '@/components/QuestChip';
import { TaskCard } from '@/components/TaskCard';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { useCharacter } from '@/lib/api/character';
import { useQuests } from '@/lib/api/quests';
import { useStreak } from '@/lib/api/streak';
import { useCompleteTask, useTasks } from '@/lib/api/tasks';
import type { TaskWithDimensions } from '@/lib/db/types';
import { formatLongDate, timeOfDayGreeting } from '@/lib/time';
import { applyStreakMultiplier, rewardForDifficulty, type Difficulty } from '@/lib/xp';
import { tokens } from '@/theme';

interface FloatItem {
  id: number;
  xp: number;
  coins: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const character = useCharacter();
  const tasks = useTasks();
  const streak = useStreak();
  const quests = useQuests();
  const completeTask = useCompleteTask();
  const [floats, setFloats] = useState<FloatItem[]>([]);
  // Per-task overrides for star difficulty, applied via swipe on the card.
  // Cleared when the day rolls over (handled implicitly: tasks list refetches).
  const [diffOverrides, setDiffOverrides] = useState<Record<string, Difficulty>>({});

  const handleComplete = (task: TaskWithDimensions) => {
    if (completeTask.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const selected: Difficulty = diffOverrides[task.id] ?? task.difficulty;
    const baseReward = rewardForDifficulty(selected);
    const reward = applyStreakMultiplier(baseReward, streak.data?.currentStreak ?? 0);
    const fid = Date.now();
    setFloats((prev) => [...prev, { id: fid, xp: reward.xp, coins: reward.coins }]);

    completeTask.mutate(
      {
        taskId: task.id,
        expectedXp: reward.xp,
        expectedCoins: reward.coins,
        dimensions: task.dimensions,
        selectedDifficulty: selected,
      },
      {
        onError: (err) => {
          const e = err as { message?: string; code?: string; details?: string };
          console.error('[complete_task] failed', e);
          Alert.alert(
            'Could not complete task',
            [e.message, e.code, e.details].filter(Boolean).join('\n') ||
              'Unknown error.',
          );
        },
      },
    );
  };

  const isLoading = character.isLoading || tasks.isLoading;
  const hasError = character.error || tasks.error;

  const handleRefresh = async () => {
    await Promise.all([
      character.refetch(),
      tasks.refetch(),
      streak.refetch(),
    ]);
  };
  const isRefreshing =
    character.isRefetching || tasks.isRefetching || streak.isRefetching;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.brand.violet2}
            colors={[tokens.brand.violet2]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatLongDate()}</Text>
          <Text style={styles.greeting}>{timeOfDayGreeting()}</Text>
          <Text style={styles.name}>
            {character.data?.profile.display_name ?? 'Adventurer'}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : hasError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={32} color={tokens.semantic.danger} />
            <Text style={styles.errorText}>
              Something went wrong loading your data. Pull to retry.
            </Text>
          </View>
        ) : (
          <>
            {character.data && (
              <HeroCard
                displayName={character.data.profile.display_name}
                totalXp={character.data.character.total_xp}
                coins={character.data.character.coins}
              />
            )}

            <QuestChip quests={quests.data} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today</Text>
              <Text style={styles.sectionMeta}>
                {tasks.data?.length ?? 0} due
              </Text>
            </View>

            {tasks.data?.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-circle" size={48} color={tokens.semantic.xp} />
                <Text style={styles.emptyTitle}>All quests cleared.</Text>
                <Text style={styles.emptySub}>Take the rest, or set a stretch goal.</Text>
              </View>
            ) : (
              <View style={styles.taskList}>
                {tasks.data?.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selectedDifficulty={diffOverrides[task.id]}
                    onSelectDifficulty={(d) =>
                      setDiffOverrides((prev) => ({ ...prev, [task.id]: d }))
                    }
                    streakDays={streak.data?.currentStreak ?? 0}
                    onComplete={() => handleComplete(task)}
                    onEdit={() =>
                      router.push({ pathname: '/task-form', params: { id: task.id } })
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {floats.map((f) => (
        <XPCoinFloat
          key={f.id}
          xp={f.xp}
          coins={f.coins}
          onDone={() => setFloats((prev) => prev.filter((x) => x.id !== f.id))}
        />
      ))}

      <Pressable
        onPress={() => router.push('/task-form')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        hitSlop={8}
      >
        <Ionicons name="add" size={28} color={tokens.text.hi} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.bg.base,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.layout.bottomNavClearance,
  },
  header: {
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[5],
  },
  dateText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: tokens.space[2],
  },
  greeting: {
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  name: {
    ...tokens.type.h1,
    color: tokens.text.hi,
    marginTop: 2,
  },
  loadingBox: {
    paddingVertical: tokens.space[10],
    alignItems: 'center',
  },
  errorBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
    gap: tokens.space[3],
  },
  errorText: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[6],
    marginBottom: tokens.space[3],
  },
  sectionTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  sectionMeta: {
    ...tokens.type.caption,
    color: tokens.text.mid,
  },
  taskList: {
    gap: tokens.space[3],
  },
  emptyBox: {
    paddingVertical: tokens.space[8],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  emptyTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
    marginTop: tokens.space[2],
  },
  emptySub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[6],
  },
  fab: {
    position: 'absolute',
    right: tokens.space[5],
    bottom: tokens.layout.bottomNavClearance + tokens.space[3],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: tokens.brand.violet,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
