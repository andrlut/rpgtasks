import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { MoodFaceRow } from '@/components/mood/MoodFaceRow';
import { todayDateKey, useLogMood, useTodayMood } from '@/lib/api/mood';
import { useT } from '@/lib/i18n';
import type { MoodValue } from '@/lib/mood';
import { useLoadedSettings } from '@/lib/settings';
import { tokens } from '@/theme';

/** AsyncStorage day-stamp — "already shown/dismissed the prompt today". */
const PROMPT_SHOWN_KEY = '@perceva/mood_prompt_shown';
/** Only nudge in the evening ("fim do dia"), never in the morning. */
const MIN_HOUR = 17;

interface Props {
  /** Suppress while a tour or other overlay owns the screen. */
  enabled?: boolean;
}

/**
 * Gentle once-per-day app-open prompt: "Como foi seu dia?" mounted on the
 * Today Hub. Shows at most once a day, only in the evening, only when the day
 * isn't logged yet and the setting is on. Both a face tap and a dismiss stamp
 * today so it never nags twice. No streak, no guilt — tapping a face logs and
 * closes; "escrever mais" opens the full screen.
 */
export function MoodCheckinPrompt({ enabled = true }: Props) {
  const { t } = useT();
  const router = useRouter();
  const settings = useLoadedSettings();
  const today = useTodayMood();
  const logMood = useLogMood();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!settings.moodCheckinPrompt) return;
    if (today.isLoading) return;
    if (today.data) return; // already logged today
    if (new Date().getHours() < MIN_HOUR) return;

    let active = true;
    (async () => {
      const shown = await AsyncStorage.getItem(PROMPT_SHOWN_KEY);
      if (active && shown !== todayDateKey()) setVisible(true);
    })();
    return () => {
      active = false;
    };
  }, [enabled, settings.moodCheckinPrompt, today.isLoading, today.data]);

  const stampAndClose = async () => {
    setVisible(false);
    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, todayDateKey());
  };

  const handleSelect = (v: MoodValue) => {
    logMood.mutate({ mood: v });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    void stampAndClose();
  };

  const handleWriteMore = () => {
    void stampAndClose();
    router.push('/mood-checkin');
  };

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={stampAndClose}
    >
      <Pressable style={styles.scrim} onPress={stampAndClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('mood.prompt.title')}</Text>
          <Text style={styles.subtitle}>{t('mood.subtitle')}</Text>

          <View style={styles.facesWrap}>
            <MoodFaceRow
              value={null}
              onSelect={handleSelect}
              size="md"
              showLabels={false}
            />
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={stampAndClose}
              style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.6 }]}
              hitSlop={6}
            >
              <Text style={styles.ghostText}>{t('mood.prompt.notNow')}</Text>
            </Pressable>
            <Pressable
              onPress={handleWriteMore}
              style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.6 }]}
              hitSlop={6}
            >
              <Text style={styles.linkText}>{t('mood.prompt.writeMore')}</Text>
            </Pressable>
          </View>

          <Text style={styles.reassure}>{t('mood.noScore')}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.bg.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: tokens.space[4],
    paddingBottom: tokens.space[6],
    gap: tokens.space[3],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border.strong,
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    ...tokens.type.h2,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  subtitle: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    marginTop: -4,
  },
  facesWrap: {
    paddingVertical: tokens.space[3],
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  ghostBtn: {
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
  },
  ghostText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.dim,
    letterSpacing: 0.3,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
  },
  linkText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.brand.violet2,
    letterSpacing: 0.3,
  },
  reassure: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.faint,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
