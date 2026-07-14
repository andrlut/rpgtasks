import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sparkline } from '@/components/Sparkline';
import { useRecentMoods, useTodayMood } from '@/lib/api/mood';
import { useT } from '@/lib/i18n';
import { moodLevel } from '@/lib/mood';
import { tokens } from '@/theme';

/**
 * "Humor de hoje" card at the top of the Percebida pillar. Shows today's face
 * + a sparkline of recent days when logged, or a gentle "registrar humor" CTA
 * when not. Quiet by design — no XP, matching the AvaliacaoPanel tone.
 */
export function MoodTodayCard() {
  const { t } = useT();
  const router = useRouter();
  const today = useTodayMood();
  const recent = useRecentMoods(14);

  const logged = today.data ?? null;
  const level = logged ? moodLevel(logged.mood) : null;
  const values = (recent.data ?? []).map((m) => m.mood);

  return (
    <Pressable
      onPress={() => router.push('/mood-checkin')}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      hitSlop={4}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.faceWrap,
          { borderColor: level ? `${level.color}66` : tokens.border.strong },
          !level && styles.faceWrapEmpty,
        ]}
      >
        <Text style={styles.emoji}>{level ? level.emoji : '🙂'}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.eyebrow}>{t('mood.todayCard.eyebrow')}</Text>
        {logged && level ? (
          <Text style={styles.value} numberOfLines={1}>
            {t('mood.todayCard.loggedPrefix')}{' '}
            <Text style={[styles.valueStrong, { color: level.color }]}>
              {t(`mood.levels.${level.key}`).toLowerCase()}
            </Text>
          </Text>
        ) : (
          <Text style={styles.value} numberOfLines={2}>
            {t('mood.todayCard.promptTitle')}
          </Text>
        )}
      </View>

      {values.length >= 2 ? (
        <Sparkline
          values={values}
          max={5}
          width={56}
          height={22}
          color={level?.color ?? tokens.brand.violet2}
        />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={tokens.brand.violet2} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  faceWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  faceWrapEmpty: {
    opacity: 0.6,
  },
  emoji: {
    fontSize: 24,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: tokens.text.dim,
  },
  value: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 19,
    color: tokens.text.base,
  },
  valueStrong: {
    fontFamily: 'Manrope_800ExtraBold',
  },
});
