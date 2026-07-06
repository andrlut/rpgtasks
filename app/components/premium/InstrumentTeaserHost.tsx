import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { INSTRUMENT_TEASER_SLUG, useInstrumentTeaserStore } from '@/lib/premium';
import { tokens } from '@/theme';

/**
 * Bottom-sheet teaser for a locked psychometric instrument. Mounted once near
 * the root (`app/app/_layout.tsx`, alongside `ConfirmHost`); any locked
 * instrument card opens it via `useInstrumentTeaserStore.open(instrumentId)`.
 *
 * It shows the instrument's name + a one-line value tease and a single CTA to
 * the paywall (`/premium?source=instrument`). It deliberately never opens the
 * questionnaire — that's the whole point of the gate.
 */
export function InstrumentTeaserHost() {
  const router = useRouter();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const instrumentId = useInstrumentTeaserStore((s) => s.instrumentId);
  const close = useInstrumentTeaserStore((s) => s.close);

  const slug = instrumentId ? INSTRUMENT_TEASER_SLUG[instrumentId] : undefined;
  const visible = slug !== undefined;

  const goToPremium = () => {
    close();
    router.push('/premium?source=instrument');
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable
          style={[
            styles.sheet,
            // Respect the device's variable bottom inset (gesture bar /
            // on-screen nav) so the CTA never sits under the system nav.
            { paddingBottom: Math.max(tokens.space[6], insets.bottom + tokens.space[4]) },
          ]}
          onPress={() => {}}
        >
          <View style={styles.handle} />
          {slug && (
            <>
              <View style={styles.lockRow}>
                <Ionicons name="lock-closed" size={14} color={tokens.brand.violet2} />
                <Text style={styles.lockChip}>{t('premium.teaser.lockedChip')}</Text>
              </View>
              <Text style={styles.title}>{t(`premium.teaser.${slug}Title`)}</Text>
              <Text style={styles.line}>{t(`premium.teaser.${slug}Line`)}</Text>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
                onPress={goToPremium}
                accessibilityRole="button"
              >
                <Ionicons name="sparkles" size={16} color={tokens.text.hi} />
                <Text style={styles.ctaText}>{t('premium.teaser.cta')}</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 22, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.bg.surface,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[3],
    // paddingBottom applied inline from safe-area insets (see render).
    gap: tokens.space[3],
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border.strong,
    marginBottom: tokens.space[2],
  },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockChip: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: tokens.brand.violet2,
  },
  title: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  line: {
    ...tokens.type.bodyLg,
    color: tokens.text.mid,
    lineHeight: 22,
  },
  cta: {
    marginTop: tokens.space[3],
    height: 52,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.brand.violet,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: tokens.text.hi,
    letterSpacing: 0.3,
  },
});
