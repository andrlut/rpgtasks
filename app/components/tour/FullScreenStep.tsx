import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PercevaGlyph } from '@/components/PercevaGlyph';
import { ScreenBackground } from '@/components/ScreenBackground';
import { tokens } from '@/theme';

/**
 * Full-screen onboarding step — reused by the tour's M0 (Boas-vindas)
 * and Wrap-up. Layout mirrors the Perceva login/onboarding hero:
 * engraved glyph at the top, eyebrow, title, body copy, primary CTA,
 * and an optional secondary action (the "Pular" link on M0).
 *
 * Renders inside its own SafeAreaView + ScreenBackground; the caller
 * just provides the copy + handlers.
 */

interface Props {
  eyebrow?: string;
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Show the engraved glyph at the top. Default true. */
  withGlyph?: boolean;
}

export function FullScreenStep({
  eyebrow,
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  withGlyph = true,
}: Props) {
  const handlePrimary = () => {
    Haptics.selectionAsync().catch(() => {});
    onPrimary();
  };
  const handleSecondary = () => {
    if (!onSecondary) return;
    Haptics.selectionAsync().catch(() => {});
    onSecondary();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground withGoldHalo>
        <View style={styles.content}>
          {withGlyph && (
            <View style={styles.glyphWrap}>
              <PercevaGlyph size={96} palette="gilded" idSuffix="tour-full" />
            </View>
          )}

          {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <Pressable
            onPress={handlePrimary}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Text style={styles.primaryText}>{primaryLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color="#3D2A00" />
          </Pressable>

          {secondaryLabel && onSecondary && (
            <Pressable
              onPress={handleSecondary}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={secondaryLabel}
            >
              <Text style={styles.secondaryText}>{secondaryLabel}</Text>
            </Pressable>
          )}
        </View>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  content: {
    flex: 1,
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[3],
  },
  glyphWrap: {
    marginBottom: tokens.space[5],
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.8,
    color: tokens.semantic.coinLight,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 28,
    lineHeight: 34,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.mid,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: tokens.space[2],
    marginBottom: tokens.space[5],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3] + 2,
    borderRadius: 999,
    backgroundColor: tokens.semantic.coin,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 138, 0.55)',
  },
  btnPressed: { opacity: 0.85 },
  primaryText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: '#3D2A00',
    letterSpacing: 0.4,
  },
  secondaryText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: tokens.text.dim,
    marginTop: tokens.space[3],
    textDecorationLine: 'underline',
  },
});
