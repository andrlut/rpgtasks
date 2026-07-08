import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { useLimitModalStore, type LimitedEntity } from '@/lib/premium';
import { tokens } from '@/theme';

/**
 * "Limite atingido" modal (P1.1). Opened by a create button when a free user
 * hits their entity cap. Leads with recognition of what they've built (copy
 * per entity, §5.2) and offers two equal-weight paths — Premium or archive —
 * never a dead-end. Mounted once in the root layout.
 */

const LINE1_KEY: Record<LimitedEntity, string> = {
  task: 'premium.limit.taskLine1',
  reward: 'premium.limit.rewardLine1',
  skill: 'premium.limit.skillLine1',
  quest: 'premium.limit.questLine1',
};

export function LimitReachedHost() {
  const router = useRouter();
  const { t } = useT();
  const entity = useLimitModalStore((s) => s.entity);
  const close = useLimitModalStore((s) => s.close);
  const visible = entity !== null;

  const goPremium = () => {
    close();
    router.push('/premium?source=limit-modal');
  };

  const goArchive = () => {
    const target = entity;
    close();
    // Route to the entity's manage/list screen so the user can archive
    // something and free a slot. Literal pushes keep expo-router typed routes.
    switch (target) {
      case 'task':
        router.push('/tasks');
        break;
      case 'reward':
        router.push('/rewards-manage');
        break;
      case 'skill':
        router.push('/skills');
        break;
      case 'quest':
        router.push('/quests');
        break;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          {entity && (
            <>
              <View style={styles.iconWrap}>
                <Ionicons name="sparkles" size={22} color={tokens.brand.violet2} />
              </View>
              <Text style={styles.line1}>{t(LINE1_KEY[entity])}</Text>
              <Text style={styles.line2}>{t('premium.limit.line2')}</Text>

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
                onPress={goPremium}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>{t('premium.limit.seePremium')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
                onPress={goArchive}
                accessibilityRole="button"
              >
                <Ionicons name="archive-outline" size={16} color={tokens.text.base} />
                <Text style={styles.secondaryText}>{t('premium.limit.archive')}</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 22, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[5],
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    padding: tokens.space[5],
    gap: tokens.space[3],
    alignItems: 'stretch',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(155, 130, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(155, 130, 255, 0.24)',
    alignSelf: 'flex-start',
  },
  line1: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  line2: {
    ...tokens.type.body,
    color: tokens.text.mid,
    marginBottom: tokens.space[1],
  },
  primaryBtn: {
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: tokens.text.hi,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  secondaryText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.base,
    letterSpacing: 0.2,
  },
});
