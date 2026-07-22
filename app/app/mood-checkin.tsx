import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoodFace, MoodFacePlaceholder } from '@/components/mood/MoodFace';
import { MoodFaceRow } from '@/components/mood/MoodFaceRow';
import { MoodTagRow } from '@/components/mood/MoodTagRow';
import { ScreenBackground } from '@/components/ScreenBackground';
import { todayDateKey, useLogMood, useMoodForDay, useMoodTags } from '@/lib/api/mood';
import { useT } from '@/lib/i18n';
import {
  MOOD_LEVELS,
  moodLevel,
  orderEmotionTags,
  splitMoodTags,
  type MoodValue,
} from '@/lib/mood';
import { tokens } from '@/theme';

/** Emotion chips shown before "ver todas" expands the full vocabulary. */
const EMOTION_PREVIEW = 12;

/** #RRGGBB → rgba() — the glow wash needs alpha'd level colors. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const GLOW_COLORS = MOOD_LEVELS.map((l) => hexToRgba(l.color, 0.16));

/**
 * Soft dome of the selected level's color behind the top of the screen —
 * the Apple State-of-Mind "the whole screen feels your answer" wash, done
 * with the CVD-validated ramp. Fades in on first selection and cross-fades
 * between levels. Purely decorative (pointerEvents none).
 */
function MoodGlowWash({ mood }: { mood: MoodValue | null }) {
  const level = useSharedValue(mood ?? 3);
  const on = useSharedValue(mood !== null ? 1 : 0);

  useEffect(() => {
    if (mood !== null) level.value = withTiming(mood, { duration: 400 });
    on.value = withTiming(mood !== null ? 1 : 0, { duration: 400 });
  }, [mood, level, on]);

  const style = useAnimatedStyle(() => ({
    opacity: on.value,
    backgroundColor: interpolateColor(
      level.value,
      [1, 2, 3, 4, 5],
      GLOW_COLORS,
    ),
  }));

  return <Animated.View pointerEvents="none" style={[styles.glow, style]} />;
}

/**
 * Daily journal check-in. Mandatory core is one tap on the 5-face scale;
 * everything else (feeling words, influences, note) is progressive and never
 * gates save. Accepts an optional `?date=YYYY-MM-DD` param for retroactive
 * logging from the history views; defaults to today. Zero XP/coins/Momentum —
 * reflection has no score.
 */
export default function MoodCheckinScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const params = useLocalSearchParams<{ date?: string }>();
  const targetDate =
    typeof params.date === 'string' && params.date.length > 0
      ? params.date
      : todayDateKey();
  const isToday = targetDate === todayDateKey();

  const day = useMoodForDay(targetDate);
  const catalog = useMoodTags();
  const logMood = useLogMood();
  const scrollRef = useRef<ScrollView>(null);

  const savedMood = (day.data?.mood ?? null) as MoodValue | null;
  const savedNote = day.data?.note ?? '';
  const savedTags = useMemo(() => day.data?.tags ?? [], [day.data?.tags]);

  const [moodDraft, setMoodDraft] = useState<MoodValue | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [tagsDraft, setTagsDraft] = useState<string[] | null>(null);
  const [showAllEmotions, setShowAllEmotions] = useState(false);

  const mood = moodDraft ?? savedMood;
  const note = noteDraft ?? savedNote;
  const tags = tagsDraft ?? savedTags;
  const level = mood !== null ? moodLevel(mood) : null;

  const { emotions, contexts } = useMemo(
    () => splitMoodTags(catalog.data ?? []),
    [catalog.data],
  );
  const orderedEmotions = useMemo(
    () => orderEmotionTags(emotions, mood),
    [emotions, mood],
  );
  // Preview keeps the closest words up front, but a tag the user already
  // picked (e.g. editing an older entry) is never hidden behind "ver todas".
  const visibleEmotions = useMemo(() => {
    if (showAllEmotions) return orderedEmotions;
    const head = orderedEmotions.slice(0, EMOTION_PREVIEW);
    const headSlugs = new Set(head.map((x) => x.slug));
    const pickedTail = orderedEmotions.filter(
      (x) => tags.includes(x.slug) && !headSlugs.has(x.slug),
    );
    return [...head, ...pickedTail];
  }, [orderedEmotions, showAllEmotions, tags]);

  const sameTags =
    tags.length === savedTags.length && tags.every((s) => savedTags.includes(s));
  const dirty =
    mood !== null &&
    (mood !== savedMood || note.trim() !== savedNote.trim() || !sameTags);
  const canSave = mood !== null && !logMood.isPending;

  const dateLabel = useMemo(() => {
    const localeTag = locale === 'en' ? 'en-US' : 'pt-BR';
    const [y, m, d] = targetDate.split('-').map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    const raw = dt.toLocaleDateString(localeTag, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [targetDate, locale]);

  const toggleTag = (slug: string) =>
    setTagsDraft((prev) => {
      const base = prev ?? savedTags;
      return base.includes(slug)
        ? base.filter((s) => s !== slug)
        : [...base, slug];
    });

  const handleSave = () => {
    if (mood === null || logMood.isPending) return;
    logMood.mutate(
      { mood, note: note.trim() || null, loggedFor: targetDate, tags },
      {
        onSuccess: () => {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          ).catch(() => {});
          router.back();
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

  const handleClose = () => {
    if (dirty) {
      Alert.alert(t('mood.discardTitle'), t('mood.discardBody'), [
        { text: t('mood.keep'), style: 'cancel' },
        {
          text: t('mood.discard'),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);
      return;
    }
    router.back();
  };

  // The note sits at the bottom of the scroll; once the viewport has shrunk
  // for the keyboard, walk the caret into view (the old absolute footer used
  // to cover exactly this spot — see the keyboard-fix note in styles.footer).
  const handleNoteFocus = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <MoodGlowWash mood={mood} />

        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
          >
            <Ionicons name="close" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('mood.title')}</Text>
          <Pressable
            onPress={() => router.push('/history')}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
            accessibilityLabel={t('mood.history.title')}
          >
            <Ionicons name="calendar-outline" size={20} color={tokens.text.hi} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* No manual keyboard padding here: the viewport ALREADY shrinks by
              the keyboard (Android resizes the window under edge-to-edge; iOS
              gets the KAV padding above), so adding keyboardHeight again
              double-counts it and the focus scrollToEnd would overshoot the
              note clean off the top of the viewport. */}
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <Text style={styles.question}>
              {isToday ? t('mood.question') : t('mood.questionPast')}
            </Text>
            <Text style={styles.subtitle}>
              {isToday ? t('mood.subtitle') : dateLabel}
            </Text>

            {/* Hero — the day's face, big. Keyed remount pops the new level
                in with a small spring; height is fixed so nothing jumps. */}
            <View style={styles.hero}>
              {level ? (
                <Animated.View
                  key={level.value}
                  entering={ZoomIn.springify().damping(14)}
                  style={styles.heroFace}
                >
                  <MoodFace value={level.value} size={96} active />
                </Animated.View>
              ) : (
                <View style={styles.heroFace}>
                  <MoodFacePlaceholder size={96} />
                </View>
              )}
              <Text style={styles.heroLabel}>
                {level ? t(`mood.levels.${level.key}`) : ' '}
              </Text>
            </View>

            <View style={styles.faces}>
              <MoodFaceRow value={mood} onSelect={setMoodDraft} size="md" />
            </View>

            {mood !== null && (
              <Animated.View
                entering={FadeInDown.duration(280)}
                style={styles.details}
              >
                <View style={styles.tagsSection}>
                  <Text style={styles.tagsLabel}>
                    {t('mood.emotionPrompt')}{' '}
                    <Text style={styles.tagsOptional}>
                      {t('mood.tagsOptional')}
                    </Text>
                  </Text>
                  <MoodTagRow
                    tags={visibleEmotions}
                    selected={tags}
                    onToggle={toggleTag}
                    trailingAction={
                      orderedEmotions.length > EMOTION_PREVIEW
                        ? {
                            label: showAllEmotions
                              ? t('mood.showFewerTags')
                              : t('mood.showAllTags', {
                                  count: orderedEmotions.length,
                                }),
                            onPress: () => setShowAllEmotions((v) => !v),
                          }
                        : undefined
                    }
                  />
                </View>

                {contexts.length > 0 && (
                  <View style={styles.tagsSection}>
                    <Text style={styles.tagsLabel}>
                      {t('mood.contextPrompt')}{' '}
                      <Text style={styles.tagsOptional}>
                        {t('mood.tagsOptional')}
                      </Text>
                    </Text>
                    <MoodTagRow
                      tags={contexts}
                      selected={tags}
                      onToggle={toggleTag}
                    />
                  </View>
                )}

                <View style={styles.noteCard}>
                  <TextInput
                    value={note}
                    onChangeText={setNoteDraft}
                    onFocus={handleNoteFocus}
                    placeholder={t('mood.notePlaceholder')}
                    placeholderTextColor={tokens.text.faint}
                    style={styles.noteInput}
                    multiline
                    textAlignVertical="top"
                    maxLength={2000}
                  />
                </View>
              </Animated.View>
            )}

            <View style={styles.reassureRow}>
              <Ionicons name="lock-open-outline" size={13} color={tokens.text.faint} />
              <Text style={styles.reassureText}>{t('mood.noScore')}</Text>
            </View>
          </ScrollView>

          {/* In normal flow (NOT absolute): with the window resizing for the
              keyboard on Android (and KAV padding on iOS) the button rides
              above the keyboard instead of covering the note input — the old
              absolute footer was exactly what hid the caret while typing. */}
          <View style={[styles.footer, !canSave && styles.footerIdle]}>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => [
                styles.saveBtn,
                canSave && styles.saveBtnActive,
                pressed && canSave && { opacity: 0.85 },
              ]}
              hitSlop={4}
            >
              <Ionicons
                name={logMood.isPending ? 'hourglass' : 'checkmark'}
                size={16}
                color={canSave ? tokens.text.hi : tokens.text.dim}
              />
              <Text
                style={[styles.saveBtnText, canSave && { color: tokens.text.hi }]}
              >
                {logMood.isPending ? t('mood.saving') : t('mood.save')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  flex: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -300,
    alignSelf: 'center',
    width: 560,
    height: 560,
    borderRadius: 280,
  },
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
    paddingBottom: tokens.space[6],
    gap: tokens.space[4],
  },
  question: {
    ...tokens.type.h1,
    color: tokens.text.hi,
    textAlign: 'center',
    marginTop: tokens.space[3],
  },
  subtitle: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    marginTop: -tokens.space[2],
  },
  hero: {
    alignItems: 'center',
    gap: tokens.space[2],
    height: 130,
  },
  heroFace: {
    width: 96,
    height: 96,
  },
  heroLabel: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  faces: {
    marginBottom: tokens.space[2],
  },
  details: {
    gap: tokens.space[4],
  },
  tagsSection: {
    gap: tokens.space[2],
  },
  tagsLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  tagsOptional: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.dim,
  },
  noteCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
    padding: tokens.space[3],
  },
  noteInput: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 21,
    color: tokens.text.hi,
    minHeight: 96,
  },
  reassureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reassureText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.faint,
    letterSpacing: 0.2,
  },
  footer: {
    padding: tokens.space[3],
    borderTopWidth: 1,
    borderTopColor: tokens.border.base,
    backgroundColor: tokens.bg.deep,
  },
  footerIdle: {
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
