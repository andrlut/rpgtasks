import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCharacter } from '@/lib/api/character';
import { supabase } from '@/lib/supabase';
import { tokens } from '@/theme';

export default function ProfileScreen() {
  const character = useCharacter();
  const profile = character.data?.profile;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={22} color={tokens.semantic.danger} />
            <Text style={[styles.rowText, { color: tokens.semantic.danger }]}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>RPG Tasks · v0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[8],
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
  section: {
    marginTop: tokens.space[4],
  },
  sectionTitle: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
