import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOnboardingStore } from '@/lib/onboarding';
import { tokens } from '@/theme';

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'WELCOME, HERO',
    title: 'Turn your life into an RPG.',
    body: 'Real tasks. Real XP. Real rewards. The grind, but make it yours.',
    icon: 'shield',
    iconColor: tokens.brand.violet2,
    iconBg: 'rgba(123, 92, 255, 0.18)',
  },
  {
    eyebrow: 'THE LOOP',
    title: 'Train. Earn. Redeem.',
    body: 'Complete habits to gain XP and coins. Spend coins on rewards you set yourself.',
    icon: 'flash',
    iconColor: tokens.semantic.xp,
    iconBg: 'rgba(61, 214, 140, 0.18)',
  },
  {
    eyebrow: 'READY?',
    title: 'Your journey starts at Level 1.',
    body: 'Pick a few starter quests. We will handle the leveling.',
    icon: 'rocket',
    iconColor: tokens.semantic.coin,
    iconBg: 'rgba(255, 200, 61, 0.18)',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const isLast = index === SLIDES.length - 1;
  const markSeen = useOnboardingStore((s) => s.markSeen);

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

      <View style={styles.topBar}>
        <Text style={styles.brand}>
          RPG<Text style={styles.brandDot}> · </Text>Tasks
        </Text>
        {!isLast && (
          <Pressable onPress={finish} hitSlop={8}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        <View style={[styles.iconBubble, { backgroundColor: slide.iconBg }]}>
          <Ionicons name={slide.icon} size={56} color={slide.iconColor} />
        </View>
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.copy}>{slide.body}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === index && styles.dotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          onPress={next}
        >
          <Text style={styles.ctaText}>{isLast ? 'Start your journey' : 'Continue'}</Text>
          {isLast && <Ionicons name="arrow-forward" size={20} color={tokens.text.hi} />}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.bg.base,
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
  brandDot: {
    color: tokens.brand.violet2,
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
  iconBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[5],
  },
  eyebrow: {
    ...tokens.type.eyebrow,
    color: tokens.brand.violet2,
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
  },
  actions: {
    paddingHorizontal: tokens.space[5],
    paddingBottom: tokens.space[4],
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tokens.brand.violet,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space[4],
  },
  ctaText: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
});
