import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

const ACCENT = tokens.semantic.coin;

/**
 * Goals sub-pillar placeholder, richer than the generic PillarPlaceholder.
 * The Goals feature doesn't exist yet, but the Desejada pillar should still
 * feel inhabited rather than empty — so this preview surfaces the concept
 * with a teaser headline, copy that maps to the V3 philosophy ("where I'm
 * heading"), and three example goals as locked tiles.
 *
 * When Goals lands (PR 2x), this gets replaced with the real listing.
 */
export function GoalsPreview() {
  const { t } = useT();
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.iconHalo}>
          <Ionicons name="flag-outline" size={28} color={ACCENT} />
        </View>
        <Text style={styles.eyebrow}>{t('goalsPreview.eyebrow')}</Text>
        <Text style={styles.title}>{t('goalsPreview.title')}</Text>
        <Text style={styles.body}>{t('goalsPreview.body')}</Text>
      </View>

      <Text style={styles.examplesLabel}>{t('goalsPreview.examples')}</Text>
      <View style={styles.examples}>
        {(['example1', 'example2', 'example3'] as const).map((k) => (
          <View key={k} style={styles.exampleRow}>
            <Ionicons
              name="lock-closed"
              size={14}
              color={tokens.text.dim}
            />
            <Text style={styles.exampleText} numberOfLines={1}>
              {t(`goalsPreview.${k}`)}
            </Text>
            <Text style={styles.lockedTag}>{t('goalsPreview.locked')}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space[3],
    paddingTop: tokens.space[4],
  },
  header: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[3],
  },
  iconHalo: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 200, 61, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: ACCENT,
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 19,
    color: tokens.text.mid,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 4,
  },
  examplesLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: tokens.space[4],
  },
  examples: {
    gap: 8,
  },
  exampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  exampleText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  lockedTag: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    color: tokens.text.dim,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
