import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMoodForDay, useMoodTags } from '@/lib/api/mood';
import { useT } from '@/lib/i18n';
import { moodLevel } from '@/lib/mood';
import { tokens } from '@/theme';

interface Props {
  /** Local YYYY-MM-DD to show/edit the mood for. */
  dateKey: string;
}

/**
 * Read view of a single day's mood — face + level + tags + note, or an empty
 * state inviting a (possibly retroactive) log. Shared by the mood history
 * calendar and the tasks History day view. The "registrar/editar" CTA opens
 * the check-in screen scoped to this exact day.
 */
export function MoodDayDetail({ dateKey }: Props) {
  const { t, locale } = useT();
  const router = useRouter();
  const day = useMoodForDay(dateKey);
  const catalog = useMoodTags();

  const entry = day.data ?? null;
  const level = entry ? moodLevel(entry.mood) : null;

  const tagLabel = (slug: string): string => {
    const tg = catalog.data?.find((x) => x.slug === slug);
    if (!tg) return slug;
    const label = locale === 'en' ? tg.label_en : tg.label_pt;
    return tg.emoji ? `${tg.emoji} ${label}` : label;
  };

  const open = () =>
    router.push({ pathname: '/mood-checkin', params: { date: dateKey } });

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>{t('mood.day.eyebrow')}</Text>
        <Pressable
          onPress={open}
          style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.6 }]}
          hitSlop={6}
        >
          <Ionicons
            name={entry ? 'create-outline' : 'add'}
            size={13}
            color={tokens.brand.violet2}
          />
          <Text style={styles.editText}>
            {entry ? t('mood.day.edit') : t('mood.day.register')}
          </Text>
        </Pressable>
      </View>

      {entry && level ? (
        <>
          {/* The level color is rendered as *area* (the filled face ring),
              not as ink: the bottom two steps of the ramp are dark blues that
              measure ~3.2:1 as text on this surface. Name stays on text.hi. */}
          <View style={styles.moodRow}>
            <View
              style={[
                styles.faceWrap,
                { backgroundColor: level.color, borderColor: level.color },
              ]}
            >
              <Text style={styles.emoji}>{level.emoji}</Text>
            </View>
            <Text style={styles.levelLabel}>{t(`mood.levels.${level.key}`)}</Text>
          </View>

          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.tagsWrap}>
              {entry.tags.map((slug) => (
                <View key={slug} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tagLabel(slug)}</Text>
                </View>
              ))}
            </View>
          )}

          {entry.note ? (
            <Text style={styles.note}>{entry.note}</Text>
          ) : null}
        </>
      ) : (
        <Text style={styles.empty}>{t('mood.day.empty')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    padding: tokens.space[3],
    gap: tokens.space[2],
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.brand.violet2,
    letterSpacing: 0.2,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
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
  emoji: { fontSize: 24 },
  levelLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: tokens.text.hi,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(123, 92, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.28)',
  },
  tagText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.base,
  },
  note: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.base,
    fontStyle: 'italic',
  },
  empty: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
});
