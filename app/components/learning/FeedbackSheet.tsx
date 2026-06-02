import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FEEDBACK_TAGS } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

/**
 * Optional follow-up after a 👍/👎 rating. Opens as a modal sheet,
 * shows predefined chips (different per rating direction) plus a free
 * text field. Save commits tags+comment; Skip closes without saving.
 *
 * Predefined tag slugs (stable, language-agnostic) live in
 * `FEEDBACK_TAGS` from db/types.ts. Their labels render through i18n
 * keys `learning.feedback.tags.<slug>`.
 */

interface Props {
  open: boolean;
  rating: -1 | 1 | null;
  initialTags?: string[];
  initialComment?: string | null;
  onClose: () => void;
  onSave: (tags: string[], comment: string | null) => void;
}

export function FeedbackSheet({
  open,
  rating,
  initialTags = [],
  initialComment = null,
  onClose,
  onSave,
}: Props) {
  const { t } = useT();
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [comment, setComment] = useState<string>(initialComment ?? '');

  // Reset state when the sheet reopens with a different rating.
  useEffect(() => {
    if (open) {
      setSelectedTags(initialTags);
      setComment(initialComment ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rating]);

  if (rating === null) return null;

  const availableTags: readonly string[] =
    rating === 1 ? FEEDBACK_TAGS.positive : FEEDBACK_TAGS.negative;

  const toggleTag = (slug: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug],
    );
  };

  const handleSave = () => {
    const trimmed = comment.trim();
    onSave(selectedTags, trimmed.length > 0 ? trimmed : null);
  };

  const accent = rating === 1 ? tokens.semantic.xp : tokens.semantic.danger;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: accent + '22' }]}>
              <Ionicons
                name={rating === 1 ? 'thumbs-up' : 'thumbs-down'}
                size={18}
                color={accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('learning.feedback.title')}</Text>
              <Text style={styles.subtitle}>{t('learning.feedback.subtitle')}</Text>
            </View>
          </View>

          <Text style={styles.section}>{t('learning.feedback.chipsLabel')}</Text>
          <View style={styles.chips}>
            {availableTags.map((slug) => {
              const selected = selectedTags.includes(slug);
              return (
                <Pressable
                  key={slug}
                  onPress={() => toggleTag(slug)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && {
                      backgroundColor: accent + '22',
                      borderColor: accent,
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && { color: accent },
                    ]}
                  >
                    {t(`learning.feedback.tags.${slug}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.section}>{t('learning.feedback.commentLabel')}</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t('learning.feedback.placeholder')}
            placeholderTextColor={tokens.text.dim}
            multiline
            numberOfLines={4}
            style={styles.input}
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.btn,
                styles.btnSkip,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.btnSkipText}>{t('learning.feedback.skip')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.btn,
                styles.btnSave,
                { backgroundColor: accent },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.btnSaveText}>{t('learning.feedback.save')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdropPress: { flex: 1 },
  sheet: {
    backgroundColor: tokens.bg.base,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    paddingHorizontal: tokens.space[4],
    paddingTop: 10,
    paddingBottom: 28,
    gap: 12,
    borderTopWidth: 1,
    borderColor: tokens.border.strong,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: tokens.border.strong,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: tokens.text.hi,
  },
  subtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.mid,
    marginTop: 1,
  },
  section: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: tokens.text.dim,
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: tokens.bg.glassStrong,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: tokens.text.base,
  },
  input: {
    minHeight: 88,
    padding: 12,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.base,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: tokens.text.hi,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSkip: {
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },
  btnSkipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  btnSave: {},
  btnSaveText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
