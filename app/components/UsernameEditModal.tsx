import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUpdateDisplayName } from '@/lib/api/profile';
import { showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';

interface Props {
  visible: boolean;
  currentValue: string;
  onClose: () => void;
}

export function UsernameEditModal({ visible, currentValue, onClose }: Props) {
  const [value, setValue] = useState(currentValue);
  const updateDisplayName = useUpdateDisplayName();

  // Re-prime input when the modal opens.
  useEffect(() => {
    if (visible) setValue(currentValue);
  }, [visible, currentValue]);

  const dirty = value.trim() !== currentValue.trim();
  const canSave = dirty && value.trim().length > 0 && !updateDisplayName.isPending;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await updateDisplayName.mutateAsync(value.trim());
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo('Could not save', msg);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.title}>Username</Text>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveBtn,
              !canSave && { opacity: 0.5 },
              pressed && canSave && { opacity: 0.8 },
            ]}
            hitSlop={8}
          >
            {updateDisplayName.isPending ? (
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
          <View style={styles.body}>
            <Text style={styles.label}>What should we call you?</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              autoFocus
              autoCapitalize="words"
              maxLength={40}
              placeholder="Adventurer"
              placeholderTextColor={tokens.text.faint}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Text style={styles.hint}>
              This is the name shown on your character header and greetings. {40 - value.length}{' '}
              characters left.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderBottomColor: tokens.border.base,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.surface,
  },
  title: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  saveBtn: {
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
    backgroundColor: tokens.brand.violet,
    borderRadius: tokens.radius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  saveText: {
    ...tokens.type.body,
    fontFamily: 'Manrope_700Bold',
    color: tokens.text.hi,
  },
  body: {
    padding: tokens.space[5],
    gap: tokens.space[3],
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
  hint: {
    ...tokens.type.caption,
    color: tokens.text.dim,
  },
});
