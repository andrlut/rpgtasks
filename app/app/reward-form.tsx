import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useArchiveReward,
  useCreateReward,
  useReward,
  useUpdateReward,
  type RewardFormInput,
} from '@/lib/api/rewards';
import type { RewardCategory } from '@/lib/db/types';
import { tokens } from '@/theme';
import { REWARD_CATEGORY_META, REWARD_CATEGORY_ORDER } from '@/theme/rewards';

const ICON_CHOICES = [
  'gift',
  'cafe',
  'tv',
  'game-controller',
  'film',
  'bed',
  'pizza',
  'beer',
  'headset',
  'ice-cream',
  'walk',
  'musical-notes',
] as const;

export default function RewardFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; category?: string }>();
  const isEdit = !!params.id;
  const initialCategory: RewardCategory =
    params.category === 'good' || params.category === 'experience'
      ? params.category
      : 'indulgence';

  const existing = useReward(params.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [costStr, setCostStr] = useState('50');
  const [icon, setIcon] = useState<string>('gift');
  const [category, setCategory] = useState<RewardCategory>(initialCategory);

  useEffect(() => {
    if (existing.data) {
      setTitle(existing.data.title);
      setDescription(existing.data.description ?? '');
      setCostStr(String(existing.data.cost));
      setIcon(existing.data.icon);
      setCategory(existing.data.category);
    }
  }, [existing.data]);

  const createReward = useCreateReward();
  const updateReward = useUpdateReward(params.id ?? '');
  const archiveReward = useArchiveReward();

  const isSubmitting =
    createReward.isPending || updateReward.isPending || archiveReward.isPending;

  const formInput = useMemo<RewardFormInput>(() => {
    const parsedCost = parseInt(costStr, 10);
    return {
      title: title.trim(),
      description: description.trim() === '' ? null : description.trim(),
      cost: Number.isFinite(parsedCost) ? parsedCost : 0,
      icon,
      category,
    };
  }, [title, description, costStr, icon, category]);

  const handleSave = async () => {
    if (!formInput.title) {
      Alert.alert('Title required', 'Give your reward a title.');
      return;
    }
    if (formInput.cost < 1) {
      Alert.alert('Cost must be at least 1', 'Set how many coins it costs.');
      return;
    }
    try {
      if (isEdit && params.id) {
        await updateReward.mutateAsync(formInput);
      } else {
        await createReward.mutateAsync(formInput);
      }
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Save failed', msg);
    }
  };

  const handleArchive = () => {
    if (!params.id) return;
    Alert.alert('Archive reward?', 'It will no longer appear on Rewards.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          if (!params.id) return;
          try {
            await archiveReward.mutateAsync(params.id);
            router.back();
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            Alert.alert('Archive failed', msg);
          }
        },
      },
    ]);
  };

  if (isEdit && existing.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={tokens.brand.violet2} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={tokens.text.hi} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit reward' : 'New reward'}</Text>
        <Pressable
          onPress={handleSave}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.saveButton,
            (pressed || isSubmitting) && { opacity: 0.6 },
          ]}
          hitSlop={8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={tokens.text.hi} size="small" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {REWARD_CATEGORY_ORDER.map((cat) => {
                const meta = REWARD_CATEGORY_META[cat];
                const selected = cat === category;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.categoryCell,
                      selected && {
                        borderColor: meta.color,
                        backgroundColor: meta.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={meta.icon as never}
                      size={18}
                      color={selected ? meta.color : tokens.text.mid}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        { color: selected ? meta.color : tokens.text.mid },
                      ]}
                    >
                      {meta.short}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="1 hour of gaming"
              placeholderTextColor={tokens.text.faint}
              autoFocus={!isEdit}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.inputMultiline]}
              placeholder="What it really means…"
              placeholderTextColor={tokens.text.faint}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Cost (coins)</Text>
            <TextInput
              value={costStr}
              onChangeText={(v) => setCostStr(v.replace(/[^0-9]/g, ''))}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="50"
              placeholderTextColor={tokens.text.faint}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_CHOICES.map((name) => {
                const selected = name === icon;
                return (
                  <Pressable
                    key={name}
                    onPress={() => setIcon(name)}
                    style={[styles.iconCell, selected && styles.iconCellSelected]}
                  >
                    <Ionicons
                      name={name as never}
                      size={22}
                      color={selected ? tokens.semantic.coin : tokens.text.mid}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {isEdit && (
            <Pressable
              onPress={handleArchive}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.archiveButton,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="archive-outline" size={18} color={tokens.semantic.danger} />
              <Text style={styles.archiveText}>Archive reward</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  headerTitle: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  saveButton: {
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
    backgroundColor: tokens.brand.violet,
    borderRadius: tokens.radius.md,
    minWidth: 72,
    alignItems: 'center',
  },
  saveText: {
    ...tokens.type.body,
    fontFamily: 'Manrope_700Bold',
    color: tokens.text.hi,
  },
  content: {
    padding: tokens.space[4],
    gap: tokens.space[5],
    paddingBottom: tokens.space[10],
  },
  field: {
    gap: tokens.space[2],
  },
  label: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    color: tokens.text.hi,
    ...tokens.type.bodyLg,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: tokens.space[3],
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCellSelected: {
    borderColor: tokens.semantic.coin,
    backgroundColor: 'rgba(255, 200, 61, 0.16)',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  categoryCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: tokens.bg.surface,
  },
  categoryText: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: tokens.space[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 122, 0.3)',
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255, 92, 122, 0.08)',
    marginTop: tokens.space[3],
  },
  archiveText: {
    ...tokens.type.body,
    color: tokens.semantic.danger,
    fontFamily: 'Manrope_700Bold',
  },
});
