import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoinIcon } from '@/components/CoinIcon';
import { EmptyHero } from '@/components/EmptyHero';
import {
  useArchivedRewards,
  useArchiveReward,
  useDeleteReward,
  useReorderRewards,
  useRestoreReward,
  useRewards,
} from '@/lib/api/rewards';
import type { Reward } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META } from '@/theme/rewards';

/**
 * Management surface for the user's rewards. Reached from the discrete
 * settings icon at the right of the Shop/Bank/Used tab row.
 *
 * Two sections:
 *   - Active: drag-to-reorder via DraggableFlatList. The order persists
 *     to reward.sort_order via the reorder_rewards RPC; the Shop tab
 *     reads in that order so the user's chosen sequence carries over.
 *   - Archived: regular list with Restore + (conditional) Delete. Hard
 *     delete only succeeds for rewards with no redemption history; we
 *     surface a clear error inline when blocked.
 */
export default function RewardsManageScreen() {
  const router = useRouter();
  const { t } = useT();
  const active = useRewards();
  const archived = useArchivedRewards();
  const reorder = useReorderRewards();
  const archive = useArchiveReward();
  const restore = useRestoreReward();
  const remove = useDeleteReward();

  const isLoading = active.isLoading || archived.isLoading;

  const activeList: Reward[] = useMemo(
    () => active.data ?? [],
    [active.data],
  );
  const archivedList: Reward[] = useMemo(
    () => archived.data ?? [],
    [archived.data],
  );

  const handleDragEnd = (next: Reward[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    reorder.mutate(next.map((r) => r.id));
  };

  const handleEdit = (reward: Reward) => {
    router.push({ pathname: '/reward-form', params: { id: reward.id } });
  };

  const handleArchive = async (reward: Reward) => {
    const ok = await confirmAction(
      t('reward.shop.archiveTitle', { title: reward.title }),
      t('reward.shop.archiveBody'),
      {
        okText: t('reward.shop.archiveOk'),
        cancelText: t('reward.common.cancel'),
        destructive: true,
      },
    );
    if (!ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    try {
      await archive.mutateAsync(reward.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo(t('reward.shop.archiveFail'), msg);
    }
  };

  const handleRestore = async (reward: Reward) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await restore.mutateAsync(reward.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo(t('rewards.manage.restoreFail'), msg);
    }
  };

  const handleDelete = async (reward: Reward) => {
    const ok = await confirmAction(
      t('rewards.manage.deleteConfirmTitle', { title: reward.title }),
      t('rewards.manage.deleteConfirmBody'),
      {
        okText: t('rewards.manage.deleteOk'),
        cancelText: t('reward.common.cancel'),
        destructive: true,
      },
    );
    if (!ok) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    try {
      await remove.mutateAsync(reward.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      // The RPC raises with a stable English phrase when redemption
      // history blocks the delete. Substring match so the localized
      // copy stays the source of truth for the UI text.
      const friendly = msg.includes('redemption history')
        ? t('rewards.manage.deleteBlockedRedemptions')
        : msg;
      showInfo(t('rewards.manage.deleteFail'), friendly);
    }
  };

  const renderActiveRow = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<Reward>) => {
    const cat = REWARD_CATEGORY_META[item.category];
    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          // 400ms is snappier than RN's 500ms default but distinct
          // enough from a tap that scrolling doesn't accidentally trip
          // the drag handler. With 120ms the previous version made the
          // entire list un-scrollable — every touch became a long-press.
          delayLongPress={400}
          disabled={isActive}
          style={[
            styles.row,
            isActive && styles.rowDragging,
          ]}
        >
          <Ionicons name="reorder-three" size={22} color={tokens.text.dim} />
          <View
            style={[
              styles.icon,
              { borderColor: `${cat.color}50`, backgroundColor: `${cat.color}26` },
            ]}
          >
            <Ionicons name={item.icon as never} size={16} color={cat.color} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.rowMeta}>
              <CoinIcon size={11} />
              <Text style={styles.rowMetaText}>
                {item.cost.toLocaleString()}
              </Text>
              <Text style={[styles.rowMetaText, { color: cat.color }]}>
                · {t(`rewards.categories.${item.category}` as const)}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleEdit(item)}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            accessibilityLabel={`Edit ${item.title}`}
          >
            <Ionicons name="create-outline" size={18} color={tokens.text.hi} />
          </Pressable>
          <Pressable
            onPress={() => handleArchive(item)}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            accessibilityLabel={`Archive ${item.title}`}
          >
            <Ionicons
              name="archive-outline"
              size={18}
              color={tokens.semantic.warn ?? '#FF9F43'}
            />
          </Pressable>
        </Pressable>
      </ScaleDecorator>
    );
  };

  const renderArchivedRow = (reward: Reward) => {
    const cat = REWARD_CATEGORY_META[reward.category];
    return (
      <View key={reward.id} style={[styles.row, styles.rowArchived]}>
        <View
          style={[
            styles.icon,
            {
              borderColor: tokens.border.base,
              backgroundColor: 'rgba(255,255,255,0.03)',
              marginLeft: 22, // align with reorder handle width
            },
          ]}
        >
          <Ionicons name={reward.icon as never} size={16} color={tokens.text.dim} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[styles.rowTitle, { color: tokens.text.mid }]}
            numberOfLines={1}
          >
            {reward.title}
          </Text>
          <View style={styles.rowMeta}>
            <CoinIcon size={11} />
            <Text style={styles.rowMetaText}>
              {reward.cost.toLocaleString()}
            </Text>
            <Text style={[styles.rowMetaText, { color: cat.color, opacity: 0.7 }]}>
              · {t(`rewards.categories.${reward.category}` as const)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => handleRestore(reward)}
          hitSlop={8}
          style={({ pressed }) => [
            styles.restoreBtn,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityLabel={`Restore ${reward.title}`}
        >
          <Ionicons name="refresh" size={14} color={tokens.brand.violet2} />
          <Text style={styles.restoreText}>
            {t('rewards.manage.restore')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleDelete(reward)}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          accessibilityLabel={`Delete ${reward.title} permanently`}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={tokens.semantic.danger}
          />
        </Pressable>
      </View>
    );
  };

  const ListHeader = (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {t('rewards.manage.sectionActive')}
      </Text>
      <Text style={styles.sectionMeta}>
        {activeList.length > 0
          ? t('rewards.manage.reorderHint')
          : t('rewards.manage.emptyActive')}
      </Text>
    </View>
  );

  const ListFooter = (
    <View style={styles.archivedBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {t('rewards.manage.sectionArchived')}
        </Text>
        {archivedList.length > 0 ? (
          <Text style={styles.sectionMeta}>
            {archivedList.length.toString()}
          </Text>
        ) : null}
      </View>
      {archivedList.length === 0 ? (
        <View style={styles.emptyArchived}>
          <Text style={styles.emptyArchivedText}>
            {t('rewards.manage.emptyArchived')}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {archivedList.map((r) => renderArchivedRow(r))}
        </View>
      )}
    </View>
  );

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
        <Text style={styles.headerTitle}>{t('rewards.manage.title')}</Text>
        <Pressable
          onPress={() => router.push('/reward-form')}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityLabel={t('reward.form.newTitle')}
        >
          <Ionicons name="add" size={24} color={tokens.text.hi} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={tokens.brand.violet2} />
        </View>
      ) : (
        <DraggableFlatList
          data={activeList}
          keyExtractor={(item) => item.id}
          renderItem={renderActiveRow}
          onDragEnd={({ data }) => handleDragEnd(data)}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            <View style={styles.emptyActive}>
              <EmptyHero tone="coin" iconName="gift" size={120} />
              <Text style={styles.emptyTitle}>
                {t('rewards.manage.emptyActive')}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          // How much the finger can drift during the long-press before
          // it cancels. Default 0/low values made scrolling impossible
          // because any micro-movement registered as "drag start".
          activationDistance={20}
        />
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
  listContent: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[10],
    gap: tokens.space[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: tokens.space[3],
    marginBottom: tokens.space[2],
  },
  sectionTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.hi,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionMeta: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
  list: {
    gap: tokens.space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  rowArchived: {
    opacity: 0.85,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  rowDragging: {
    borderColor: tokens.brand.violet2,
    backgroundColor: 'rgba(155,130,255,0.10)',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rowMetaText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontSize: 11,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(155,130,255,0.35)',
    backgroundColor: 'rgba(155,130,255,0.1)',
  },
  restoreText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
  archivedBlock: {
    marginTop: tokens.space[5],
  },
  emptyArchived: {
    paddingVertical: tokens.space[4],
    alignItems: 'center',
  },
  emptyArchivedText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  emptyActive: {
    alignItems: 'center',
    paddingVertical: tokens.space[6],
    gap: tokens.space[2],
  },
  emptyTitle: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[6],
  },
});
