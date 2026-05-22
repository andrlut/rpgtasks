import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PercevaGlyph } from '@/components/PercevaGlyph';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useT } from '@/lib/i18n';
import { useOnboardingStore } from '@/lib/onboarding';
import { tokens } from '@/theme';

interface SlideArt {
  key: 'slide1' | 'slide2' | 'slide3';
  /** Either an Ionicon name OR the Perceva brand glyph (slide 1 only,
   *  so the very first screen lands on identity). */
  art: { kind: 'icon'; name: keyof typeof Ionicons.glyphMap } | { kind: 'perceva' };
  iconColor: string;
  iconBg: string;
}

const SLIDE_ART: SlideArt[] = [
  {
    key: 'slide1',
    art: { kind: 'perceva' },
    iconColor: tokens.brand.violet2,
    iconBg: 'rgba(123, 92, 255, 0.18)',
  },
  {
    key: 'slide2',
    art: { kind: 'icon', name: 'flash' },
    iconColor: tokens.semantic.xp,
    iconBg: 'rgba(61, 214, 140, 0.18)',
  },
  {
    key: 'slide3',
    art: { kind: 'icon', name: 'rocket' },
    iconColor: tokens.semantic.coin,
    iconBg: 'rgba(255, 200, 61, 0.18)',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const slide = SLIDE_ART[index]!;
  const isLast = index === SLIDE_ART.length - 1;
  const markSeen = useOnboardingStore((s) => s.markSeen);

  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const finish = async () => {
    await markSeen();
    router.replace('/login');
  };

  const next = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground>

      <View style={styles.topBar}>
        <Text style={styles.brand}>{t('onboarding.brand')}</Text>
        {!isLast && (
          <Pressable onPress={finish} hitSlop={8}>
            <Text style={styles.skip}>{t('onboarding.skip')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        <Animated.View
          key={`art-${index}`}
          entering={FadeIn.duration(420)}
          style={styles.artWrap}
        >
          {/* Soft radial-ish backdrop: 2 stacked glow rings behind the bubble */}
          <View
            style={[
              styles.glowOuter,
              { backgroundColor: slide.iconColor, opacity: 0.10 },
            ]}
          />
          <View
            style={[
              styles.glowInner,
              { backgroundColor: slide.iconColor, opacity: 0.18 },
            ]}
          />
          <View
            style={[
              styles.iconBubble,
              {
                backgroundColor: slide.iconBg,
                shadowColor: slide.iconColor,
              },
            ]}
          >
            {slide.art.kind === 'perceva' ? (
              <PercevaGlyph
                size={96}
                bare
                palette="primary"
                idSuffix="onboarding"
              />
            ) : (
              <Ionicons name={slide.art.name} size={56} color={slide.iconColor} />
            )}
          </View>
        </Animated.View>

        <Animated.View
          key={`text-${index}`}
          entering={FadeInDown.duration(420).delay(120)}
          style={styles.textWrap}
        >
          <Text style={[styles.eyebrow, { color: slide.iconColor }]}>
            {t(`onboarding.${slide.key}.eyebrow`)}
          </Text>
          <Text style={styles.title}>{t(`onboarding.${slide.key}.title`)}</Text>
          <Text style={styles.copy}>{t(`onboarding.${slide.key}.body`)}</Text>
        </Animated.View>
      </View>

      <View style={styles.dots}>
        {SLIDE_ART.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && styles.dotActive,
              i === index && { shadowColor: slide.iconColor },
            ]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <Pressable
            onPressIn={() => {
              ctaScale.value = withSpring(0.97, tokens.motion.springSnappy);
            }}
            onPressOut={() => {
              ctaScale.value = withSpring(1, tokens.motion.springBouncy);
            }}
            onPress={next}
          >
            <LinearGradient
              colors={tokens.gradient.completeBtn}
              locations={tokens.gradient.completeBtnLocations}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cta}
            >
              <Text style={styles.ctaText}>
                {isLast ? t('onboarding.start') : t('onboarding.continue')}
              </Text>
              {isLast && <Ionicons name="arrow-forward" size={20} color={tokens.text.hi} />}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.bg.deep,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3],
  },
  brand: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  skip: {
    ...tokens.type.body,
    color: tokens.text.mid,
    fontFamily: 'Manrope_700Bold',
  },
  body: {
    flex: 1,
    paddingHorizontal: tokens.space[6],
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[3],
  },
  artWrap: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[5],
  },
  glowOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  glowInner: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  iconBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  textWrap: {
    alignItems: 'center',
    gap: tokens.space[3],
  },
  eyebrow: {
    ...tokens.type.eyebrow,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    ...tokens.type.h1,
    color: tokens.text.hi,
    textAlign: 'center',
    paddingHorizontal: tokens.space[3],
  },
  copy: {
    ...tokens.type.bodyLg,
    color: tokens.text.mid,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginVertical: tokens.space[5],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.text.faint,
  },
  dotActive: {
    width: 24,
    backgroundColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  actions: {
    paddingHorizontal: tokens.space[5],
    paddingBottom: tokens.space[4],
  },
  ctaWrap: {
    ...tokens.shadow.violetGlow,
    borderRadius: tokens.radius.md,
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ctaText: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
});
