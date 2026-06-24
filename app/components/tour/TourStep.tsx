import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  useBottomNavClearance,
  useBottomSafeClearance,
} from '@/components/BottomNavBar';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

/**
 * In-app tour spotlight tooltip — interactive version.
 *
 * Renders as a positioned overlay (NOT a Modal) so the user can still
 * tap the UI underneath. The backdrop is purely cosmetic (`pointerEvents:
 * 'none'`); only the tooltip card catches touches. When a step declares
 * `awaitEvent`, the tour advances on a real gesture (tap a task, expand
 * the drawer, etc) and the "Próximo" button becomes a hint pill that
 * tells the user what action will continue. A "Próximo mesmo assim"
 * escape hatch stays available so the user is never trapped.
 */

export interface TourStepData {
  title: string;
  body: string;
  /** Which half of the screen the card pins to. Defaults to bottom. */
  position?: 'top' | 'bottom';
  /** Primary CTA label. Defaults to "Próximo". */
  primaryLabel?: string;
  /**
   * When set, advance when the matching event fires on the
   * `useTourEventBus`. The card surfaces a hint ("Faça isso pra
   * continuar") and we still expose a small "Pular este passo" link
   * so the user can bypass if the gesture detection fails.
   */
  awaitEvent?: string;
  /**
   * Milliseconds after mount before the step auto-advances. Used for
   * timed steps (e.g. the XP animation moment in M1 step 5). Mutually
   * exclusive with `awaitEvent` — if both set, the event wins.
   */
  autoAdvanceMs?: number;
}

interface Props extends TourStepData {
  /** 1-indexed step number for the N/M progress label. */
  stepIndex: number;
  totalSteps: number;
  /**
   * When true, use the smaller safe-area clearance instead of the
   * floating-nav clearance — for screens without a BottomNavBar.
   */
  flatNav?: boolean;
  onNext: () => void;
  /** Called by both the X button and the "Pular este módulo" link. */
  onSkip: () => void;
  /**
   * Called when the user uses the inline "Pular este passo" escape
   * inside an awaitEvent step. Same effect as onNext (advance) but
   * lets us track that the user didn't actually do the gesture if we
   * want to analyse it later. Defaults to onNext when omitted.
   */
  onSkipStep?: () => void;
}

export function TourStep({
  title,
  body,
  position = 'bottom',
  primaryLabel,
  awaitEvent,
  stepIndex,
  totalSteps,
  flatNav = false,
  onNext,
  onSkip,
  onSkipStep,
}: Props) {
  const { t } = useT();
  // Tooltips pinned to the bottom must clear whatever sits at the
  // bottom of THIS screen: the floating BottomNavBar on tab screens,
  // or just the safe-area inset on Stack-pushed screens (task-form,
  // /tasks) that don't render the bar. Both hooks run unconditionally
  // (rules-of-hooks); we pick the value with `flatNav`.
  const navClearance = useBottomNavClearance();
  const safeClearance = useBottomSafeClearance();
  const bottomClearance = flatNav ? safeClearance : navClearance;

  const handleNext = () => {
    Haptics.selectionAsync().catch(() => {});
    onNext();
  };
  const handleSkip = () => {
    Haptics.selectionAsync().catch(() => {});
    onSkip();
  };
  const handleSkipStep = () => {
    Haptics.selectionAsync().catch(() => {});
    (onSkipStep ?? onNext)();
  };

  return (
    <View
      style={[
        styles.overlay,
        position === 'top' ? styles.alignTop : styles.alignBottom,
      ]}
      pointerEvents="box-none"
    >
      {/* No dim band — leaves every pixel above the tooltip card
         visible AND interactive. The card itself has high opacity +
         gold rim + drop shadow, so it stands out without darkening
         the underlying UI. */}

      {/* Tooltip card — the only interactive layer. */}
      <View
        style={[
          styles.cardWrap,
          position === 'bottom'
            ? { paddingBottom: bottomClearance + tokens.space[2] }
            : { paddingTop: tokens.space[8] },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.progress}>
              {stepIndex} / {totalSteps}
            </Text>
            <Pressable
              onPress={handleSkip}
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('tour.common.skipModule')}
            >
              <Ionicons name="close" size={16} color={tokens.text.mid} />
            </Pressable>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          {awaitEvent ? (
            <View style={styles.awaitGroup}>
              <View style={styles.awaitRow}>
                <Ionicons
                  name="hand-left"
                  size={14}
                  color={tokens.semantic.coinLight}
                />
                <Text style={styles.awaitText}>{t('tour.common.tryIt')}</Text>
              </View>
              <Pressable
                onPress={handleSkipStep}
                hitSlop={6}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.skipLink}>
                  {t('tour.common.skipStep')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.85 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel ?? t('tour.common.next')}
            >
              <Text style={styles.primaryText}>
                {primaryLabel ?? t('tour.common.next')}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#3D2A00" />
            </Pressable>
          )}

          <Pressable
            onPress={handleSkip}
            hitSlop={6}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Text style={styles.skipModule}>
              {t('tour.common.skipModule')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // The container itself is "see-through" for gestures — we lift only
    // the card to auto-pointer-events below.
  },
  alignTop: {
    justifyContent: 'flex-start',
  },
  alignBottom: {
    justifyContent: 'flex-end',
  },
  cardWrap: {
    paddingHorizontal: tokens.space[4],
    // paddingTop/paddingBottom are set inline based on `position` +
    // the floating BottomNavBar clearance.
  },
  card: {
    backgroundColor: 'rgba(26, 31, 68, 0.96)',
    borderRadius: tokens.radius.lg,
    padding: tokens.space[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 61, 0.35)',
    gap: tokens.space[2] + 2,
    // No dim band behind us — a deep shadow lifts the card off the
    // underlying UI so the user can tell where the tour ends and the
    // real screen begins.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progress: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: tokens.semantic.coinLight,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: tokens.bg.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    lineHeight: 21,
    color: tokens.text.hi,
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: tokens.text.mid,
  },
  primaryBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2] + 4,
    borderRadius: 999,
    backgroundColor: tokens.semantic.coin,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 138, 0.55)',
    marginTop: tokens.space[2],
  },
  primaryText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: '#3D2A00',
    letterSpacing: 0.3,
  },
  awaitGroup: {
    marginTop: tokens.space[1],
    gap: 4,
  },
  awaitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: tokens.space[2],
  },
  awaitText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    color: tokens.semantic.coinLight,
    letterSpacing: 0.3,
  },
  skipLink: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    textDecorationLine: 'underline',
  },
  skipModule: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
});
