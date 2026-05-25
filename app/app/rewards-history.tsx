import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoinIcon } from '@/components/CoinIcon';
import { EmptyHero } from '@/components/EmptyHero';
import { useUsedRewards } from '@/lib/api/rewards';
import { useT } from '@/lib/i18n';
import { timeAgo } from '@/lib/time';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

/**
 * Full-screen Used Rewards history — append-only log of what the user
 * has spent. Read-only, no actions. Reached from the clock icon in the
 * Shop screen header.
 *
 * Lean row layout: cat-tinted icon tile + title/timestamp on the left,
 * cost paid on the right. Same visual as the old in-screen tab, just
 * extracted to its own route.
 */
export default function RewardsHistoryScreen() {
  const router = useRouter();
  const { t } = useT();
  const used = useUsedRewards(50);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={tokens.text.hi} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('rewards.history.title')}</Text>
        <View style={styles.iconButton} />
      </View>

      {used.isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={tokens.brand.violet2} />
        </View>
      ) : (used.data?.length ?? 0) === 0 ? (
        <View style={styles.emptyBox}>
          <EmptyHero tone="coin" iconName="gift" size={140} />
          <Text style={styles.emptyTitle}>
            {t('rewards.history.emptyTitle')}
          </Text>
          <Text style={styles.emptySub}>
            {t('rewards.history.emptySub')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.list}>
            {used.data!.map((r) => {
              const cat = r.reward_category
                ? REWARD_CATEGORY_META[r.reward_category]
                : null;
              return (
                <View key={r.id} style={styles.row}>
                  <View
                    style={[
                      styles.iconWrap,
                      cat
                        ? { backgroundColor: cat.bg }
                        : { backgroundColor: 'rgba(255,255,255,0.05)' },
                    ]}
                  >
                    <Ionicons
                      name={r.reward_icon as never}
                      size={14}
                      color={cat ? cat.color : tokens.text.mid}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {r.reward_title}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {r.used_at ? timeAgo(r.used_at) : ''}
                    </Text>
                  </View>
                  <View style={styles.rowCost}>
                    <CoinIcon size={11} />
                    <Text style={styles.rowCostText}>
                      −{r.cost_paid.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  },
  list: {
    gap: tokens.space[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    ...tokens.type.body,
    color: tokens.text.base,
    fontFamily: 'Manrope_600SemiBold',
  },
  rowMeta: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 11,
    marginTop: 1,
  },
  rowCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowCostText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontFamily: 'Manrope_700Bold',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    padding: tokens.space[6],
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
});
