import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { MoodFace } from '@/components/mood/MoodFace';
import { MoodFaceRow } from '@/components/mood/MoodFaceRow';
import { useLogMood, useTodayMood } from '@/lib/api/mood';
import { useT } from '@/lib/i18n';
import { moodLevel, type MoodValue } from '@/lib/mood';
import { tokens } from '@/theme';

/**
 * Journal entry point ON the Today Hub — "marcar e ver onde o dia acontece".
 * Unlogged: the question + the 5-face row; one tap logs instantly (same
 * quick path as the evening prompt). Logged: the day's face + level and an
 * edit affordance; when the entry has no tags/note yet, the subline nudges
 * "adicionar detalhes". Either state opens the full check-in on press.
 * Deliberately quiet — no XP, no streak, matching the mood system's rule.
 */
export function MoodHubStrip() {
  const { t } = useT();
  const router = useRouter();
  const today = useTodayMood();
  const logMood = useLogMood();

  // Render only on a SUCCESSFUL fetch: while loading there's nothing to show,
  // and in the error state "no data" does NOT mean "no entry" — showing the
  // quick-log row there would let one tap upsert {note: null, tags: null}
  // over an existing entry and silently wipe the day's journal.
  if (!today.isSuccess) return null;

  const entry = today.data ?? null;
  const openCheckin = () => router.push('/mood-checkin');

  if (!entry) {
    const quickLog = (v: MoodValue) => {
      if (logMood.isPending) return;
      logMood.mutate(
        { mood: v },
        {
          onSuccess: () => {
            // Haptic only once the RPC actually landed — a premature success
            // signal on a failed save would gaslight the user.
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          },
          onError: (err) => {
            Alert.alert(
              t('mood.saveError'),
              (err as { message?: string }).message ?? '',
            );
          },
        },
      );
    };
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>{t('mood.prompt.title')}</Text>
          <Pressable
            onPress={openCheckin}
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('mood.prompt.writeMore')}
          >
            <Text style={styles.linkText}>{t('mood.prompt.writeMore')}</Text>
            <Ionicons name="chevron-forward" size={12} color={tokens.brand.violet2} />
          </Pressable>
        </View>
        <View style={[logMood.isPending && { opacity: 0.5 }]}>
          <MoodFaceRow
            value={null}
            onSelect={quickLog}
            size="sm"
            showLabels={false}
          />
        </View>
      </View>
    );
  }

  const level = moodLevel(entry.mood);
  const hasDetails =
    (entry.tags?.length ?? 0) > 0 || (entry.note?.trim().length ?? 0) > 0;
  // An explicit label on an accessible container SUPPRESSES the flattened
  // child text — a bare "Editar" would hide the logged mood from TalkBack,
  // so the label composes the full state the sighted user sees.
  const loggedA11yLabel = [
    `${t('mood.todayCard.eyebrow')}: ${t(`mood.levels.${level.key}`)}`,
    hasDetails ? t('mood.day.edit') : t('mood.hub.addDetails'),
  ].join('. ');

  return (
    <Pressable
      onPress={openCheckin}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
      accessibilityLabel={loggedA11yLabel}
    >
      <View style={styles.loggedRow}>
        <MoodFace value={level.value} size={38} active />
        <View style={styles.loggedBody}>
          <Text style={styles.eyebrow}>{t('mood.todayCard.eyebrow')}</Text>
          <Text style={styles.loggedValue} numberOfLines={1}>
            {t('mood.todayCard.loggedPrefix')}{' '}
            <Text style={styles.loggedStrong}>
              {t(`mood.levels.${level.key}`).toLowerCase()}
            </Text>
          </Text>
          {!hasDetails && (
            <Text style={styles.detailsNudge}>{t('mood.hub.addDetails')}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={tokens.brand.violet2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: tokens.space[4],
    marginTop: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    gap: tokens.space[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: tokens.text.dim,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.brand.violet2,
    letterSpacing: 0.2,
  },
  loggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  loggedBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  loggedValue: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 19,
    color: tokens.text.base,
  },
  loggedStrong: {
    fontFamily: 'Manrope_800ExtraBold',
    color: tokens.text.hi,
  },
  detailsNudge: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.brand.violet2,
  },
});
