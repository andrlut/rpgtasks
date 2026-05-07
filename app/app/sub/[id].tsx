import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { Sparkline } from '@/components/Sparkline';
import {
  SubAnchorCard,
  SubAnchorCardLabels,
} from '@/components/SubAnchorCard';
import { pickSubScores, pickSubScoresDecimal, useCharacter } from '@/lib/api/character';
import { useAssessmentHistoryAll } from '@/lib/api/questionnaire';
import { useTaskTemplates } from '@/lib/api/tasks';
import type { SubId, TaskTemplateWithSubs } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { formatScore } from '@/lib/util/formatScore';
import { tokens } from '@/theme';
import { SUB_META } from '@/theme/dimensions';

const SUB_IDS = new Set<SubId>(Object.keys(SUB_META) as SubId[]);

function isSubId(v: string | undefined): v is SubId {
  return !!v && SUB_IDS.has(v as SubId);
}

/**
 * Permanent glossary screen — focused on a single sub. Modal route opened
 * from anywhere a sub is mentioned (TaskCard sub pill, HexChart legend
 * cards, SubPanel header inside /dimension/[id], self-assessment slider
 * card). Layout puts the full 5-string content (summary, definition, low
 * mid, high) front-and-center, plus current scores and recommended tasks.
 */
export default function SubDetailScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const params = useLocalSearchParams<{ id: string }>();
  const metaLookup = useMetaLookup();
  const character = useCharacter();
  const history = useAssessmentHistoryAll('self');
  const templates = useTaskTemplates();

  // Hooks must run unconditionally — bail out via render branch after.
  const validSubId = isSubId(params.id) ? params.id : null;

  const selfMap = useMemo(
    () => pickSubScores(character.data?.subScores ?? [], 'self'),
    [character.data?.subScores],
  );
  const quizMap = useMemo(
    () => pickSubScoresDecimal(character.data?.subScores ?? [], 'questionnaire'),
    [character.data?.subScores],
  );
  const subTemplates: TaskTemplateWithSubs[] = useMemo(() => {
    if (!validSubId) return [];
    const all = templates.data ?? [];
    return all.filter((tmpl) => tmpl.primary_sub_id === validSubId);
  }, [templates.data, validSubId]);

  if (!validSubId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Unknown sub.</Text>
          <Pressable style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Close</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const subId = validSubId;
  const subMeta = metaLookup.sub(subId);
  const dimMeta = metaLookup.dim(subMeta.dimensionId);
  const anchorLabels = locale === 'en' ? SubAnchorCardLabels.en : undefined;

  const selfScore = selfMap.get(subId) ?? 0;
  const quizScore = quizMap.get(subId);

  const subHistory = history.data?.get(subId) ?? [];
  const trendValues = subHistory.slice(-30).map((h) => h.score);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — icon halo + title + score block */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.iconHalo,
                {
                  backgroundColor: dimMeta.bg,
                  borderColor: `${dimMeta.color}55`,
                },
              ]}
            >
              <Ionicons
                name={subMeta.iconName as never}
                size={28}
                color={dimMeta.color}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, { color: dimMeta.color }]}>
                {dimMeta.label.toUpperCase()}
              </Text>
              <Text style={styles.title}>{subMeta.label}</Text>
            </View>
          </View>

          {/* Score block */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreCol}>
              <Text style={styles.scoreEyebrow}>
                {locale === 'en' ? 'SELF' : 'SELF'}
              </Text>
              <Text style={[styles.scoreNum, { color: dimMeta.color }]}>
                {formatScore(selfScore)}
              </Text>
              <Text style={styles.scoreScale}>/ 5</Text>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreCol}>
              <Text style={styles.scoreEyebrow}>
                {locale === 'en' ? 'QUIZ' : 'AVALIAÇÃO'}
              </Text>
              <Text style={[styles.scoreNum, { color: dimMeta.color }]}>
                {quizScore != null ? formatScore(quizScore) : '—'}
              </Text>
              <Text style={styles.scoreScale}>/ 5</Text>
            </View>
            {trendValues.length >= 2 && (
              <View style={styles.sparklineWrap}>
                <Text style={styles.scoreEyebrow}>
                  {locale === 'en' ? 'TREND' : 'TENDÊNCIA'}
                </Text>
                <Sparkline
                  values={trendValues}
                  max={5}
                  width={88}
                  height={28}
                  color={dimMeta.color}
                />
              </View>
            )}
          </View>

          {/* Summary + definition */}
          <Text style={styles.summary}>{subMeta.summary}</Text>
          <Text style={styles.definition}>{subMeta.definition}</Text>

          {/* Anchors */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: dimMeta.color }]}>
              {locale === 'en' ? 'WHAT IT LOOKS LIKE' : 'COMO PARECE'}
            </Text>
            <View style={styles.anchorsBlock}>
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
          </View>

          {/* Recommended tasks */}
          {subTemplates.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: dimMeta.color }]}>
                {t('selfAssessment.recommendedTasks').toUpperCase()}
              </Text>
              {subTemplates.map((tmpl) => (
                <View
                  key={tmpl.id}
                  style={[
                    styles.templateRow,
                    { borderColor: `${dimMeta.color}33` },
                  ]}
                >
                  <Text style={styles.templateTitle}>{tmpl.title}</Text>
                  {tmpl.description && (
                    <Text style={styles.templateDesc} numberOfLines={2}>
                      {tmpl.description}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Pillar link */}
          <Pressable
            onPress={() =>
              router.replace({
                pathname: '/dimension/[id]',
                params: { id: subMeta.dimensionId },
              })
            }
            style={({ pressed }) => [
              styles.pillarLink,
              pressed && { opacity: 0.7 },
            ]}
            hitSlop={4}
          >
            <Text
              style={[styles.pillarLinkText, { color: dimMeta.color }]}
            >
              {locale === 'en'
                ? `See full ${dimMeta.label} pillar`
                : `Ver pillar completo (${dimMeta.label})`}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={dimMeta.color}
            />
          </Pressable>

          <View style={{ height: tokens.space[6] }} />
        </ScrollView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[3],
  },
  topBarSpacer: { flex: 1 },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[5],
    gap: tokens.space[3],
  },
  errorText: {
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  errorBtn: {
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
  },
  errorBtnText: {
    fontFamily: 'Manrope_700Bold',
    color: tokens.text.hi,
  },
  content: {
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[7],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    marginBottom: tokens.space[5],
  },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    color: tokens.text.hi,
    letterSpacing: -0.4,
  },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[4],
    gap: tokens.space[3],
    marginBottom: tokens.space[5],
  },
  scoreCol: {
    gap: 2,
    minWidth: 60,
  },
  scoreEyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.dim,
    letterSpacing: 1.2,
  },
  scoreNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1,
  },
  scoreScale: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: tokens.border.base,
  },
  sparklineWrap: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    gap: 4,
  },

  summary: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    lineHeight: 24,
    color: tokens.text.hi,
    marginBottom: tokens.space[3],
  },
  definition: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 21,
    color: tokens.text.base,
    marginBottom: tokens.space[5],
  },

  section: {
    gap: tokens.space[3],
    marginBottom: tokens.space[5],
  },
  sectionTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.4,
  },
  anchorsBlock: {
    gap: tokens.space[2],
  },

  templateRow: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    gap: 4,
  },
  templateTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  templateDesc: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.mid,
  },

  pillarLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
  },
  pillarLinkText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
