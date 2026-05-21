import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLocalizedPick } from '@/lib/i18n/catalog';
import { useT } from '@/lib/i18n';
import type {
  QuestTemplate,
  QuestTemplateRequirement,
  QuestWithProgress,
} from '@/lib/db/types';
import { tokens } from '@/theme';
import { getQuestCategoryMeta } from '@/theme/quests';

import { CoinIcon } from './CoinIcon';

const LONG_PRESS_MS = 400;

/**
 * Unified quest card used on the Quest Board for BOTH:
 *
 *   - `inactive`: a system template the user hasn't started yet. Shows
 *     description, optional task/skill chips derived from the template's
 *     requirements JSON, reward row + partial pill, and a play badge on
 *     the right. Long-press surfaces a hint and opens the detail screen.
 *
 *   - `active`: a quest the user has in flight. Shows description and
 *     rewards above, then a divider and a progress block (aggregate
 *     across requirements) with "Em andamento" + days remaining. If the
 *     quest is `isComplete`, a Claim pill is rendered at the bottom.
 *
 * Both variants share the same outer card with a colored accent bar on
 * the left tinted by the category.
 */
type Props =
  | {
      variant: 'inactive';
      template: QuestTemplate;
      /** Dim the card when the user already has an active copy of this template. */
      alreadyActive?: boolean;
      onStart: () => void;
      onLongPress?: () => void;
      isStarting?: boolean;
      /** Show "Segure para ver mais" hint below the card. */
      showLongPressHint?: boolean;
    }
  | {
      variant: 'active';
      data: QuestWithProgress;
      onLongPress?: () => void;
      onClaim?: () => void;
      isClaiming?: boolean;
    };

export function QuestCard(props: Props) {
  if (props.variant === 'inactive') return <InactiveCard {...props} />;
  return <ActiveCard {...props} />;
}

// ─── Inactive (template) ────────────────────────────────────────────────────

function InactiveCard({
  template,
  alreadyActive,
  onStart,
  onLongPress,
  isStarting,
  showLongPressHint,
}: Extract<Props, { variant: 'inactive' }>) {
  const { pickCascade, pickCascadeNullable } = useLocalizedPick();
  const { t } = useT();
  const cat = getQuestCategoryMeta(template.category);
  const title = pickCascade(template.title_en, template.title_pt, template.title);
  const description = pickCascadeNullable(
    template.description_en,
    template.description_pt,
    template.description,
  );
  const chips = chipLabelsFromRequirements(template.requirements);

  return (
    <View>
      <Pressable
        onPress={onStart}
        onLongPress={onLongPress}
        delayLongPress={LONG_PRESS_MS}
        disabled={isStarting || alreadyActive}
        style={({ pressed }) => [
          styles.card,
          alreadyActive && styles.cardDim,
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <View style={[styles.accent, { backgroundColor: cat.color }]} />

        <View style={styles.topRow}>
          <View style={[styles.icon, { backgroundColor: cat.bg }]}>
            <Ionicons name={cat.icon as never} size={14} color={cat.color} />
          </View>
          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.duration}>{template.suggested_duration_days}d</Text>
            </View>
            {description && (
              <Text style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            )}
            {chips.length > 0 && (
              <View style={styles.chipsRow}>
                {chips.slice(0, 3).map((label, i) => (
                  <View
                    key={`${label}-${i}`}
                    style={[styles.chip, { backgroundColor: cat.bg }]}
                  >
                    <Text style={[styles.chipText, { color: cat.color }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                ))}
                {chips.length > 3 && (
                  <View style={[styles.chip, { backgroundColor: tokens.bg.surface2 }]}>
                    <Text style={[styles.chipText, { color: tokens.text.dim }]}>
                      +{chips.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <View style={styles.rewardRow}>
              <View style={styles.rewardItem}>
                <Ionicons name="flash" size={11} color={tokens.brand.violet2} />
                <Text style={[styles.rewardText, { color: tokens.brand.violet2 }]}>
                  +{template.reward_xp}
                </Text>
              </View>
              <View style={styles.rewardItem}>
                <CoinIcon size={11} />
                <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
                  +{template.reward_coins}
                </Text>
              </View>
              {template.allow_partial && (
                <View style={styles.partialBadge}>
                  <Text style={styles.partialText}>{t('quests.partialOk')}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.playBtn, { borderColor: cat.color }]}>
            <Ionicons name="play" size={12} color={cat.color} />
          </View>
        </View>
      </Pressable>

      {showLongPressHint && (
        <View style={styles.hintRow}>
          <Ionicons name="ellipse-outline" size={9} color={tokens.text.faint} />
          <Text style={styles.hintText}>{t('quests.longPressHint')}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Active (user-owned) ────────────────────────────────────────────────────

function ActiveCard({
  data,
  onLongPress,
  onClaim,
  isClaiming,
}: Extract<Props, { variant: 'active' }>) {
  const { t } = useT();
  // Active quests don't have a category column on the row — the template
  // category is the source of truth. Without joining template here, we
  // fall back to brand-violet via the unknown-category default. The
  // long-term fix is to copy category onto the quest at adoption.
  const cat = getQuestCategoryMeta('');
  const isChallenge = data.quest.quest_type === 'challenge';
  const challengeTarget = Number(data.quest.challenge_target_value ?? 0);
  const progress = isChallenge
    ? challengeTarget > 0
      ? Math.min(1, data.currentChallengeValue / challengeTarget)
      : 0
    : aggregateProgress(data.requirements);
  const days = daysRemaining(data.quest.deadline);
  const totalReqs = data.requirements.length;
  const metReqs = data.requirements.filter((r) => r.isMet).length;

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={LONG_PRESS_MS}
      style={({ pressed }) => [
        styles.card,
        styles.cardActive,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={data.quest.title}
    >
      <View style={[styles.accent, { backgroundColor: cat.color }]} />

      <View style={styles.topRow}>
        <View style={[styles.icon, { backgroundColor: cat.bg }]}>
          <Ionicons name="flag" size={14} color={cat.color} />
        </View>
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {data.quest.title}
            </Text>
            <Text style={styles.duration}>{totalDurationDays(data.quest)}d</Text>
          </View>
          {data.quest.description && (
            <Text style={styles.description} numberOfLines={2}>
              {data.quest.description}
            </Text>
          )}
          <View style={styles.rewardRow}>
            <View style={styles.rewardItem}>
              <Ionicons name="flash" size={11} color={tokens.brand.violet2} />
              <Text style={[styles.rewardText, { color: tokens.brand.violet2 }]}>
                +{data.quest.reward_xp}
              </Text>
            </View>
            <View style={styles.rewardItem}>
              <CoinIcon size={11} />
              <Text style={[styles.rewardText, { color: tokens.semantic.coin }]}>
                +{data.quest.reward_coins}
              </Text>
            </View>
            {data.quest.allow_partial && (
              <View style={styles.partialBadge}>
                <Text style={styles.partialText}>{t('quests.partialOk')}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>{t('quests.progressLabel')}</Text>
          <Text style={styles.progressValue}>
            {isChallenge
              ? `${data.currentChallengeValue} / ${challengeTarget}`
              : `${metReqs} / ${totalReqs}`}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: cat.color },
            ]}
          />
        </View>
        <View style={styles.progressFooter}>
          <View style={styles.progressStatus}>
            <View style={styles.progressDot} />
            <Text style={styles.progressStatusText}>
              {data.isComplete ? t('quests.readyToClaim') : t('quests.inProgress')}
            </Text>
          </View>
          {days !== null && (
            <Text style={styles.daysLeft}>
              {days <= 0 ? t('quests.dueToday') : t('quests.daysLeft', { count: days })}
            </Text>
          )}
        </View>
      </View>

      {data.isComplete && onClaim && (
        <Pressable
          onPress={onClaim}
          disabled={isClaiming}
          style={({ pressed }) => [
            styles.claimBtn,
            (pressed || isClaiming) && { opacity: 0.85 },
          ]}
        >
          <LinearGradient
            colors={tokens.gradient.coinBtn}
            locations={tokens.gradient.coinBtnLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="trophy" size={14} color="#3D2A00" />
          <Text style={styles.claimText}>{t('quests.claim')}</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Pull short labels from a template's requirements JSON for the chip row.
 * Prefers the most user-readable field per kind.
 */
function chipLabelsFromRequirements(reqs: QuestTemplateRequirement[]): string[] {
  return reqs
    .map((r) => {
      switch (r.kind) {
        case 'complete_task_n_times':
          return r.task_title ?? null;
        case 'reach_skill_value':
          return r.skill_id ?? null;
        case 'complete_any_in_dim':
          return r.dimension_id ?? null;
        default:
          return null;
      }
    })
    .filter((v): v is string => !!v);
}

function aggregateProgress(reqs: QuestWithProgress['requirements']): number {
  if (reqs.length === 0) return 0;
  let sum = 0;
  for (const r of reqs) {
    const target =
      r.requirement.kind === 'reach_skill_value'
        ? Number(r.requirement.min_value ?? 0)
        : Number(r.requirement.target_count ?? 0);
    if (target <= 0) continue;
    sum += Math.min(1, r.currentCount / target);
  }
  return sum / reqs.length;
}

function daysRemaining(deadlineIso: string): number | null {
  if (!deadlineIso) return null;
  const ms = new Date(deadlineIso).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

function totalDurationDays(quest: { started_at: string; deadline: string }): number {
  const span =
    new Date(quest.deadline).getTime() - new Date(quest.started_at).getTime();
  return Math.max(1, Math.round(span / 86400000));
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    paddingLeft: tokens.space[3] + 4,
    overflow: 'hidden',
  },
  cardActive: {
    backgroundColor: 'rgba(26,31,68,0.65)',
    borderColor: 'rgba(123,92,255,0.22)',
  },
  cardDim: {
    opacity: 0.55,
  },
  cardPressed: {
    opacity: 0.85,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[2] + 2,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.hi,
    flex: 1,
  },
  duration: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.faint,
  },
  description: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 15,
    color: tokens.text.mid,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 1,
  },
  chip: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    maxWidth: 110,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rewardText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
  },
  partialBadge: {
    backgroundColor: 'rgba(160,143,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(160,143,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    marginLeft: 'auto',
  },
  partialText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.brand.violet2,
  },
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: tokens.space[3] + 4,
    paddingTop: 3,
  },
  hintText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    color: tokens.text.faint,
  },
  // Active-only
  progressBlock: {
    marginTop: tokens.space[2] + 2,
    paddingTop: tokens.space[2] + 2,
    borderTopWidth: 1,
    borderTopColor: tokens.border.base,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  progressLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    color: tokens.text.mid,
  },
  progressValue: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.brand.violet2,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: tokens.bg.surface2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: tokens.semantic.xp,
  },
  progressStatusText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    color: tokens.semantic.xp,
    letterSpacing: 0.3,
  },
  daysLeft: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.faint,
  },
  claimBtn: {
    overflow: 'hidden',
    marginTop: tokens.space[2] + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[2] + 1,
    borderRadius: tokens.radius.md,
  },
  claimText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: '#3D2A00',
    letterSpacing: 0.3,
  },
});
