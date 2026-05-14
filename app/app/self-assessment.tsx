import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useQueryClient } from '@tanstack/react-query';

import { ScreenBackground } from '@/components/ScreenBackground';
import { Sparkline } from '@/components/Sparkline';
import {
  SubAnchorCard,
  SubAnchorCardLabels,
} from '@/components/SubAnchorCard';
import {
  characterKeys,
  pickSubScores,
  pickSubScoresDecimal,
  useCharacter,
} from '@/lib/api/character';
import {
  questionnaireKeys,
  useAssessmentHistoryAll,
} from '@/lib/api/questionnaire';
import type { SubId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { supabase } from '@/lib/supabase';
import { formatScore } from '@/lib/util/formatScore';
import { tokens } from '@/theme';
import { DIMENSION_ORDER, SUBS_BY_DIM } from '@/theme/dimensions';

const TREND_DAYS = 90;
const SLIDER_STEP = 0.5;

type DraftMap = Map<SubId, number>;

export default function SelfAssessmentScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const metaLookup = useMetaLookup();
  const character = useCharacter();
  const history = useAssessmentHistoryAll('self');
  const qc = useQueryClient();

  const savedSelfScores = useMemo(
    () => pickSubScoresDecimal(character.data?.subScores ?? [], 'self'),
    [character.data?.subScores],
  );
  const savedQuizScores = useMemo(
    () => pickSubScoresDecimal(character.data?.subScores ?? [], 'questionnaire'),
    [character.data?.subScores],
  );
  const hasQuestionnaire = useMemo(
    () => pickSubScores(character.data?.subScores ?? [], 'questionnaire').size > 0,
    [character.data?.subScores],
  );

  const [drafts, setDrafts] = useState<DraftMap>(new Map());
  const [saving, setSaving] = useState(false);

  const dirtySubs = useMemo<SubId[]>(() => {
    const out: SubId[] = [];
    for (const [subId, value] of drafts.entries()) {
      const saved = savedSelfScores.get(subId) ?? 0;
      if (Math.abs(value - saved) > 0.01) out.push(subId);
    }
    return out;
  }, [drafts, savedSelfScores]);

  const hasPending = dirtySubs.length > 0;

  const handleSlide = (subId: SubId, value: number) => {
    const snapped = Math.round(value / SLIDER_STEP) * SLIDER_STEP;
    setDrafts((prev) => {
      const next = new Map(prev);
      next.set(subId, snapped);
      return next;
    });
  };

  const handleSave = async () => {
    if (!hasPending || saving) return;
    setSaving(true);
    const entries = dirtySubs.map((sub_id) => ({
      sub_id,
      score_decimal: drafts.get(sub_id),
    }));
    const { error } = await supabase.rpc('set_sub_scores_bulk', {
      p_source: 'self',
      p_entries: entries,
    });
    setSaving(false);
    if (error) {
      Alert.alert(
        locale === 'en' ? 'Could not save' : 'Não foi possível salvar',
        error.message,
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    setDrafts(new Map());
    qc.invalidateQueries({ queryKey: characterKeys.me() });
    qc.invalidateQueries({ queryKey: questionnaireKeys.all });
  };

  const handleClose = () => {
    if (hasPending) {
      Alert.alert(
        locale === 'en' ? 'Discard changes?' : 'Descartar mudanças?',
        locale === 'en'
          ? 'You have unsaved changes. Discard them?'
          : 'Você tem mudanças não salvas. Descartar?',
        [
          {
            text: locale === 'en' ? 'Keep editing' : 'Continuar',
            style: 'cancel',
          },
          {
            text: locale === 'en' ? 'Discard' : 'Descartar',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ],
      );
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={10}
          >
            <Ionicons name="close" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('selfAssessment.title')}</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            {locale === 'en'
              ? 'Where you stand in each area today. Drag the slider to update — read the description first if you want a steadier reference.'
              : 'Onde você tá em cada área hoje. Arraste o slider pra atualizar — leia a descrição antes se quiser uma âncora mais firme.'}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.scaleHint}>
              <Text style={styles.scaleHintText}>
                {locale === 'en' ? '0 missing · 5 mastery' : '0 vazio · 5 pleno'}
              </Text>
            </View>
            {hasQuestionnaire && (
              <View style={styles.qChip}>
                <Ionicons
                  name="clipboard"
                  size={11}
                  color={tokens.dimension.bonds}
                />
                <Text style={styles.qChipText}>
                  {locale === 'en'
                    ? 'Quiz reference shown'
                    : 'Referência da Avaliação ativa'}
                </Text>
              </View>
            )}
          </View>

          {DIMENSION_ORDER.map((dim) => {
            const meta = metaLookup.dim(dim);
            return (
              <View key={dim} style={styles.dimSection}>
                <View
                  style={[
                    styles.dimHeader,
                    {
                      backgroundColor: meta.bg,
                      borderColor: `${meta.color}55`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dimIconWrap,
                      { backgroundColor: `${meta.color}33` },
                    ]}
                  >
                    <Ionicons
                      name={meta.iconName as never}
                      size={18}
                      color={meta.color}
                    />
                  </View>
                  <Text style={[styles.dimLabel, { color: meta.color }]}>
                    {meta.label.toUpperCase()}
                  </Text>
                </View>

                {SUBS_BY_DIM[dim].map((subId) => (
                  <SubSliderCard
                    key={subId}
                    subId={subId}
                    saved={savedSelfScores.get(subId) ?? 0}
                    quizScore={savedQuizScores.get(subId)}
                    pending={drafts.get(subId)}
                    history={history.data?.get(subId) ?? []}
                    onSlide={(v) => handleSlide(subId, v)}
                  />
                ))}
              </View>
            );
          })}

          {/* Always reserve room for the sticky save footer (~68px). Idle
              state used to use tokens.space[6] (24px) which left the last
              sub card partially under the translucent footer. */}
          <View style={{ height: 96 }} />
        </ScrollView>

        {/* Sticky save footer */}
        <View
          style={[
            styles.saveFooter,
            !hasPending && styles.saveFooterIdle,
          ]}
          pointerEvents={hasPending ? 'auto' : 'none'}
        >
          <Pressable
            onPress={handleSave}
            disabled={!hasPending || saving}
            style={({ pressed }) => [
              styles.saveBtn,
              hasPending && styles.saveBtnActive,
              pressed && hasPending && { opacity: 0.85 },
            ]}
            hitSlop={4}
          >
            <Ionicons
              name={saving ? 'hourglass' : 'checkmark'}
              size={16}
              color={hasPending ? tokens.text.hi : tokens.text.dim}
            />
            <Text
              style={[
                styles.saveBtnText,
                hasPending && { color: tokens.text.hi },
              ]}
            >
              {saving
                ? locale === 'en'
                  ? 'Saving…'
                  : 'Salvando…'
                : hasPending
                  ? locale === 'en'
                    ? `Save ${dirtySubs.length} change${dirtySubs.length === 1 ? '' : 's'}`
                    : `Salvar ${dirtySubs.length} mudança${dirtySubs.length === 1 ? '' : 's'}`
                  : locale === 'en'
                    ? 'No changes'
                    : 'Sem mudanças'}
            </Text>
          </Pressable>
        </View>
      </ScreenBackground>
    </SafeAreaView>
  );
}

interface SubSliderCardProps {
  subId: SubId;
  saved: number;
  quizScore: number | undefined;
  pending: number | undefined;
  history: { score: number; recorded_at: string }[];
  onSlide: (value: number) => void;
}

function SubSliderCard({
  subId,
  saved,
  quizScore,
  pending,
  history,
  onSlide,
}: SubSliderCardProps) {
  const { locale } = useT();
  const router = useRouter();
  const metaLookup = useMetaLookup();
  const subMeta = metaLookup.sub(subId);
  const dimMeta = metaLookup.dim(subMeta.dimensionId);
  const [expanded, setExpanded] = useState(false);
  const anchorLabels = locale === 'en' ? SubAnchorCardLabels.en : undefined;

  const current = pending ?? saved;
  const isDirty =
    pending !== undefined && Math.abs(pending - saved) > 0.01;

  // 90-day trendline window. Filter by recorded_at then take score.
  const cutoff = Date.now() - TREND_DAYS * 86_400_000;
  const trendValues = history
    .filter((h) => new Date(h.recorded_at).getTime() >= cutoff)
    .map((h) => h.score);

  return (
    <View style={[cardStyles.card, { borderColor: `${dimMeta.color}33` }]}>
      <View style={cardStyles.headerRow}>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/sub/[id]', params: { id: subId } })
          }
          style={({ pressed }) => [
            cardStyles.headerLeft,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={4}
        >
          <Ionicons
            name={subMeta.iconName as never}
            size={16}
            color={dimMeta.color}
          />
          <Text style={cardStyles.subTitle}>{subMeta.label}</Text>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={`${dimMeta.color}99`}
          />
        </Pressable>
        <View style={cardStyles.scoreBlock}>
          <Text style={[cardStyles.scoreNum, { color: dimMeta.color }]}>
            {formatScore(current)}
          </Text>
          <Text style={cardStyles.scoreScale}>/5</Text>
        </View>
      </View>

      <Text style={cardStyles.summary}>{subMeta.summary}</Text>

      {/* Slider */}
      <Slider
        value={current}
        minimumValue={0}
        maximumValue={5}
        step={SLIDER_STEP}
        minimumTrackTintColor={dimMeta.color}
        maximumTrackTintColor={`${dimMeta.color}33`}
        thumbTintColor={dimMeta.color}
        onValueChange={onSlide}
        style={cardStyles.slider}
      />

      {/* Pending vs saved hint */}
      <View style={cardStyles.metaRow}>
        {isDirty ? (
          <Text style={[cardStyles.dirtyHint, { color: dimMeta.color }]}>
            {locale === 'en'
              ? `pending · was ${formatScore(saved)}`
              : `pendente · era ${formatScore(saved)}`}
          </Text>
        ) : (
          <View />
        )}
        <View style={cardStyles.metaRight}>
          {quizScore != null && (
            <Text style={cardStyles.quizRef}>
              {locale === 'en' ? 'quiz' : 'quiz'} · {formatScore(quizScore)}
            </Text>
          )}
          {trendValues.length >= 2 && (
            <Sparkline
              values={trendValues}
              max={5}
              width={56}
              height={16}
              color={dimMeta.color}
            />
          )}
        </View>
      </View>

      {/* Expand "Ver detalhes" → definition + 3 anchors */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [
          cardStyles.expandRow,
          pressed && { opacity: 0.7 },
        ]}
        hitSlop={4}
      >
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={13}
          color={`${dimMeta.color}99`}
        />
        <Text style={[cardStyles.expandText, { color: `${dimMeta.color}99` }]}>
          {expanded
            ? locale === 'en'
              ? 'Hide details'
              : 'Esconder detalhes'
            : locale === 'en'
              ? 'See details'
              : 'Ver detalhes'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={cardStyles.detailsBlock}>
          <Text style={cardStyles.definition}>{subMeta.definition}</Text>
          <SubAnchorCard
            variant="low"
            text={subMeta.low}
            label={anchorLabels?.low}
          />
          <SubAnchorCard
            variant="mid"
            text={subMeta.mid}
            label={anchorLabels?.mid}
          />
          <SubAnchorCard
            variant="high"
            text={subMeta.high}
            label={anchorLabels?.high}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.divider,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingBottom: tokens.space[7],
    gap: tokens.space[5],
  },
  intro: {
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  scaleHint: {
    paddingHorizontal: tokens.space[3],
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  scaleHintText: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  qChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: tokens.space[2],
    paddingVertical: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(77,208,255,0.12)',
  },
  qChipText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.dimension.bonds,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  dimSection: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[3],
    gap: tokens.space[3],
  },
  dimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  dimIconWrap: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1,
  },

  saveFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: tokens.space[3],
    borderTopWidth: 1,
    borderTopColor: tokens.border.base,
    backgroundColor: tokens.bg.deep,
  },
  saveFooterIdle: {
    opacity: 0.5,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  saveBtnActive: {
    backgroundColor: tokens.brand.violet,
    borderColor: tokens.brand.violet,
  },
  saveBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: tokens.space[3],
    gap: tokens.space[2],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  subTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.text.hi,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  scoreNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  scoreScale: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  summary: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.mid,
    fontStyle: 'italic',
  },
  slider: {
    width: '100%',
    height: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dirtyHint: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quizRef: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.dimension.bonds,
    letterSpacing: 0.3,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  expandText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  detailsBlock: {
    gap: tokens.space[2],
    paddingTop: 4,
  },
  definition: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.base,
    marginBottom: 4,
  },
});
