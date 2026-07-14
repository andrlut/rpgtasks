import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoodFaceRow } from '@/components/mood/MoodFaceRow';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useLogMood, useTodayMood } from '@/lib/api/mood';
import { useT } from '@/lib/i18n';
import type { MoodValue } from '@/lib/mood';
import { tokens } from '@/theme';

/**
 * Daily mood check-in. The mandatory core is a single tap on the 5-face scale;
 * the note is always optional and never gates save. Cloned structurally from
 * self-assessment.tsx (modal header, ScreenBackground, sticky save footer,
 * discard-confirm on close). Zero XP / coins / Momentum — reflection has no
 * score attached.
 */
export default function MoodCheckinScreen() {
  const router = useRouter();
  const { t } = useT();
  const today = useTodayMood();
  const logMood = useLogMood();

  const savedMood = (today.data?.mood ?? null) as MoodValue | null;
  const savedNote = today.data?.note ?? '';

  // `null` = untouched → fall back to the saved value (revising today's entry).
  const [moodDraft, setMoodDraft] = useState<MoodValue | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const mood = moodDraft ?? savedMood;
  const note = noteDraft ?? savedNote;

  const dirty =
    mood !== null && (mood !== savedMood || note.trim() !== savedNote.trim());
  const canSave = mood !== null && !logMood.isPending;

  const handleSave = () => {
    if (mood === null || logMood.isPending) return;
    logMood.mutate(
      { mood, note: note.trim() || null },
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            hitSlop={10}
          >
            <Ionicons name="close" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('mood.title')}</Text>
          <View style={styles.closeBtn} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.question}>{t('mood.question')}</Text>
            <Text style={styles.subtitle}>{t('mood.subtitle')}</Text>

            <View style={styles.faces}>
              <MoodFaceRow value={mood} onSelect={setMoodDraft} size="lg" />
            </View>

            <View style={styles.noteCard}>
              <TextInput
                value={note}
                onChangeText={setNoteDraft}
                placeholder={t('mood.notePlaceholder')}
                placeholderTextColor={tokens.text.faint}
                style={styles.noteInput}
                multiline
                textAlignVertical="top"
                maxLength={2000}
              />
            </View>

            <View style={styles.reassureRow}>
              <Ionicons name="lock-open-outline" size={13} color={tokens.text.faint} />
              <Text style={styles.reassureText}>{t('mood.noScore')}</Text>
            </View>

            <View style={{ height: 96 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.saveFooter, !canSave && styles.saveFooterIdle]}>
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
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  flex: { flex: 1 },
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
    gap: tokens.space[4],
  },
  question: {
    ...tokens.type.h1,
    color: tokens.text.hi,
    textAlign: 'center',
    marginTop: tokens.space[4],
  },
  subtitle: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    marginTop: -tokens.space[2],
  },
  faces: {
    marginTop: tokens.space[3],
    marginBottom: tokens.space[2],
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
    minHeight: 80,
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
