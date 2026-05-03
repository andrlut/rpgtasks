import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { tokens } from '@/theme';

/**
 * Custom skill creation form. Stub — full form (name, dim picker, unit,
 * 5 tier thresholds, descriptions) lands in PR-4.
 */
export default function SkillFormScreen() {
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
            <Ionicons name="close" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>New Skill</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <Ionicons name="construct" size={48} color={tokens.text.dim} />
          <Text style={styles.heading}>Custom skill creation</Text>
          <Text style={styles.copy}>
            Soon you&apos;ll be able to define your own skill here — name,
            category, unit, and the 5 tier thresholds with descriptions and
            population percentiles.
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
