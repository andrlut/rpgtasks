import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { tokens } from '@/theme';

/**
 * Skills hub stub. Real implementation lands in PR-3 of the Skills work
 * (My / Browse / Custom segments). For now this is just a navigable
 * placeholder so the "See all skills" CTA on the Hero tab actually goes
 * somewhere.
 */
export default function SkillsHubScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>All Skills</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <Ionicons name="construct" size={48} color={tokens.text.dim} />
          <Text style={styles.heading}>Skills hub coming soon</Text>
          <Text style={styles.copy}>
            Browse the full catalog, filter by category, and create custom
            skills with your own tier thresholds. Shipping next.
          </Text>
        </View>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  title: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[6],
    gap: tokens.space[3],
  },
  heading: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  copy: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
  },
});
