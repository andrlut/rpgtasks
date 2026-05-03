import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestWithProgress } from '@/lib/db/types';
import { tokens } from '@/theme';

import { CoinIcon } from './CoinIcon';
import { ProgressBar } from './ProgressBar';

interface Props {
  data: QuestWithProgress;
  onClaim?: () => void;
  onAbandon?: () => void;
}

function formatRequirementLabel(
  req: QuestWithProgress['requirements'][number],
): string {
  const r = req.requirement;
  switch (r.kind) {
    case 'complete_task_n_times':
      return `Complete the linked task ${r.target_count}× total`;
    case 'complete_any_in_dim':
      return `Complete ${r.target_count}× any task in ${r.dimension_id}`;
    case 'reach_skill_value':
      return `Reach ${r.min_value} on skill "${r.skill_id}"`;
  }
}

function formatDeadline(deadlineIso: string): {
  text: string;
  urgent: boolean;
} {
  const now = Date.now();
  const dl = new Date(deadlineIso).getTime();
  const ms = dl - now;
  if (ms < 0) {
    const dPast = Math.floor(-ms / 86400000);
    return { text: `Expired ${dPast}d ago`, urgent: true };
  }
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days >= 2) return { text: `${days} days left`, urgent: false };
  if (days === 1) return { text: `1 day left`, urgent: true };
  return { text: `${hours}h left`, urgent: true };
}

export function QuestCard({ data, onClaim, onAbandon }: Props) {
  const { quest, requirements, isComplete } = data;
  const isActive = quest.status === 'active';
  const deadline = formatDeadline(quest.deadline);

  return (
    <View
      style={[
        styles.container,
        isComplete && styles.containerComplete,
        !isActive && !isComplete && styles.containerDim,
      ]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={2}>
            {quest.title}
          </Text>
          {quest.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {quest.description}
            </Text>
          ) : null}
        </View>
        {isActive && (
          <View
            style={[
              styles.deadlinePill,
              deadline.urgent && styles.deadlinePillUrgent,
            ]}
          >
            <Ionicons
              name="time-outline"
              size={12}
              color={
                deadline.urgent ? tokens.semantic.danger : tokens.text.mid
              }
            />
            <Text
              style={[
                styles.deadlineText,
                {
                  color: deadline.urgent
                    ? tokens.semantic.danger
                    : tokens.text.mid,
                },
              ]}
            >
              {deadline.text}
            </Text>
          </View>
        )}
        {!isActive && (
          <View style={[styles.statusPill, styles[`statusPill_${quest.status}`]]}>
            <Text style={styles.statusText}>{quest.status.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.requirements}>
        {requirements.map((rr) => {
          const target =
            rr.requirement.kind === 'reach_skill_value'
              ? Number(rr.requirement.min_value ?? 0)
              : Number(rr.requirement.target_count ?? 0);
          return (
            <View key={rr.requirement.id} style={styles.requirementRow}>
              <View style={styles.requirementHeader}>
                <Text style={styles.requirementText} numberOfLines={2}>
                  {formatRequirementLabel(rr)}
                </Text>
                <Text
                  style={[
                    styles.requirementCount,
                    rr.isMet && { color: tokens.semantic.xp },
                  ]}
                >
                  {rr.currentCount} / {target}
                </Text>
              </View>
              <ProgressBar
                value={Math.min(rr.currentCount, target)}
                max={target || 1}
                color={rr.isMet ? tokens.semantic.xp : tokens.brand.violet}
                height={4}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.rewardRow}>
        <View style={styles.rewardItem}>
          <Ionicons name="flash" size={12} color={tokens.semantic.xp} />
          <Text style={[styles.rewardText, { color: tokens.semantic.xp }]}>
            +{quest.reward_xp}
          </Text>
        </View>
        <View style={styles.rewardItem}>
          <CoinIcon size={12} />
          <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
            +{quest.reward_coins}
          </Text>
        </View>
      </View>

      {isActive && (
        <View style={styles.actionsRow}>
          {isComplete && onClaim ? (
            <Pressable
              onPress={onClaim}
              style={({ pressed }) => [
                styles.claimBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <LinearGradient
                colors={tokens.gradient.coinBtn}
                locations={tokens.gradient.coinBtnLocations}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.passthrough]}
              />
              <Ionicons name="trophy" size={18} color="#3D2A00" />
              <Text style={styles.claimText}>Claim reward</Text>
            </Pressable>
          ) : null}
          {onAbandon && !isComplete && (
            <Pressable
              onPress={onAbandon}
              style={({ pressed }) => [
                styles.abandonBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.abandonText}>Abandon</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.lg,
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  containerComplete: {
    borderColor: tokens.semantic.coin,
    ...tokens.shadow.coinGlowSoft,
  },
  containerDim: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[3],
  },
  title: {
    ...tokens.type.bodyLg,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  description: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    marginTop: 2,
  },
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.surface2,
  },
  deadlinePillUrgent: {
    backgroundColor: 'rgba(255, 92, 122, 0.12)',
  },
  deadlineText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  statusPill: {
    paddingHorizontal: tokens.space[3],
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.surface2,
  },
  statusPill_completed: { backgroundColor: 'rgba(61, 214, 140, 0.16)' },
  statusPill_failed: { backgroundColor: 'rgba(255, 92, 122, 0.16)' },
  statusPill_expired: { backgroundColor: 'rgba(155, 130, 255, 0.16)' },
  statusPill_abandoned: { backgroundColor: 'rgba(110, 116, 168, 0.16)' },
  statusPill_active: { backgroundColor: 'rgba(123, 92, 255, 0.16)' },
  statusText: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 0.5,
    fontSize: 9,
  },
  requirements: {
    gap: tokens.space[2],
  },
  requirementRow: {
    gap: 4,
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  requirementText: {
    ...tokens.type.caption,
    color: tokens.text.base,
    flex: 1,
  },
  requirementCount: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    fontFamily: 'Manrope_800ExtraBold',
  },
  rewardRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  claimBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...tokens.shadow.coinGlow,
  },
  claimText: {
    ...tokens.type.body,
    color: '#3D2A00',
    fontFamily: 'Manrope_800ExtraBold',
  },
  abandonBtn: {
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  abandonText: {
    ...tokens.type.body,
    color: tokens.text.mid,
    fontFamily: 'Manrope_700Bold',
  },
  passthrough: {
    pointerEvents: 'none',
  },
});
