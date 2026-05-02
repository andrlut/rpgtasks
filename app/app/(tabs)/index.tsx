import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeroCard } from '@/components/HeroCard';
import { TaskCard } from '@/components/TaskCard';
import { XPCoinFloat } from '@/components/XPCoinFloat';
import { useCharacter } from '@/lib/api/character';
import { useCompleteTask, useTasks } from '@/lib/api/tasks';
import type { TaskWithDimensions } from '@/lib/db/types';
import { rewardForDifficulty } from '@/lib/xp';
import { tokens } from '@/theme';

interface FloatItem {
  id: number;
  xp: number;
  coins: number;
}

export default function HomeScreen() {
  const character = useCharacter();
  const tasks = useTasks();
  const completeTask = useCompleteTask();
  const [floats, setFloats] = useState<FloatItem[]>([]);

  const handleComplete = (task: TaskWithDimensions) => {
    if (completeTask.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const reward = rewardForDifficulty(task.difficulty);
    const fid = Date.now();
    setFloats((prev) => [...prev, { id: fid, xp: reward.xp, coins: reward.coins }]);

    completeTask.mutate({
      taskId: task.id,
      expectedXp: reward.xp,
      expectedCoins: reward.coins,
      dimensions: task.dimensions,
    });
  };

  const isLoading = character.isLoading || tasks.isLoading;
  const hasError = character.error || tasks.error;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Good day,</Text>
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
                  <TaskCard key={task.id} task={task} onComplete={() => handleComplete(task)} />
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
    paddingBottom: tokens.space[8],
  },
  header: {
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[5],
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
});
