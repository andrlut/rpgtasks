import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  body: string;
  /** Optional accent color for the title text + close icon. */
  accent?: string;
}

/**
 * Centered info modal for short explanations (how-it-works copy on a chip,
 * why-this-rule blurbs). Replaces native Alert.alert in surfaces where the
 * native dialog was failing to show on some devices.
 *
 * Tap the backdrop or the close icon to dismiss. Body text supports plain
 * \n line breaks for bullet lists.
 */
export function InfoSheet({
  visible,
  onClose,
  title,
  body,
  accent = tokens.brand.violet2,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner pressable swallows taps so they don't dismiss when tapping
            the sheet itself. */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: accent }]} numberOfLines={2}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.6 },
              ]}
              hitSlop={10}
            >
              <Ionicons name="close" size={20} color={tokens.text.mid} />
            </Pressable>
          </View>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.okBtn,
              { backgroundColor: accent },
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={4}
          >
            <Text style={styles.okBtnText}>Entendi</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.space[5],
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    padding: tokens.space[5],
    gap: tokens.space[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[3],
  },
  title: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 21,
    color: tokens.text.base,
  },
  okBtn: {
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    alignItems: 'center',
  },
  okBtnText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    letterSpacing: 0.3,
    color: tokens.text.hi,
  },
});
