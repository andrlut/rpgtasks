import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCharacter } from '@/lib/api/character';
import { useOnboardingStore } from '@/lib/onboarding';
import { supabase } from '@/lib/supabase';
import { tokens } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const character = useCharacter();
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const profile = character.data?.profile;

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckForUpdate = async () => {
    if (isCheckingUpdate) return;
    if (__DEV__) {
      Alert.alert(
        'Dev mode',
        'OTA updates are only available on production builds (the APK), not in Expo Go / dev mode.',
      );
      return;
    }
    setIsCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update ready',
          'Restart the app now to apply it?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Restart', onPress: () => Updates.reloadAsync() },
          ],
        );
      } else {
        Alert.alert('Up to date', 'You are on the latest version.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Could not check', msg);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign out?', 'You can log back in with the same email.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleReplayOnboarding = async () => {
    await resetOnboarding();
    router.push('/onboarding');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.display_name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.display_name ?? 'Adventurer'}</Text>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={handleReplayOnboarding}
        >
          <Ionicons name="play-circle-outline" size={22} color={tokens.brand.violet2} />
          <Text style={[styles.rowText, { color: tokens.text.hi }]}>Replay onboarding</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.row,
            { marginTop: tokens.space[2] },
            pressed && styles.rowPressed,
          ]}
          onPress={handleCheckForUpdate}
          disabled={isCheckingUpdate}
        >
          {isCheckingUpdate ? (
            <ActivityIndicator color={tokens.brand.violet2} size="small" style={{ width: 22 }} />
          ) : (
            <Ionicons name="cloud-download-outline" size={22} color={tokens.brand.violet2} />
          )}
          <Text style={[styles.rowText, { color: tokens.text.hi }]}>
            {isCheckingUpdate ? 'Checking...' : 'Check for updates'}
          </Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={22} color={tokens.semantic.danger} />
          <Text style={[styles.rowText, { color: tokens.semantic.danger }]}>Sign out</Text>
        </Pressable>

        <Text style={styles.footer}>
          RPG Tasks · v{Constants.expoConfig?.version ?? '0'}
          {Updates.updateId ? `\nupdate ${Updates.updateId.slice(0, 8)}` : ''}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.layout.bottomNavClearance,
  },
  header: {
    alignItems: 'center',
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[5],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.brand.violetDeep,
    borderWidth: 2,
    borderColor: tokens.brand.violet2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.space[3],
  },
  avatarText: {
    ...tokens.type.numLg,
    color: tokens.text.hi,
  },
  name: {
    ...tokens.type.h1,
    color: tokens.text.hi,
  },
  sectionTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: tokens.space[5],
    marginBottom: tokens.space[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    backgroundColor: tokens.bg.surface,
    padding: tokens.space[4],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowText: {
    ...tokens.type.bodyLg,
    fontFamily: 'Manrope_700Bold',
  },
  footer: {
    ...tokens.type.caption,
    color: tokens.text.faint,
    textAlign: 'center',
    marginTop: tokens.space[8],
  },
});
