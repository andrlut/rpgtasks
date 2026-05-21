import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

interface Props {
  onPress: () => void;
}

/**
 * Sticky-looking full-width button rendered at the end of the Home scroll
 * area. Navigates to the full task management screen (`/tasks`) where
 * users can edit / archive / configure recurrence.
 */
export function ManageTasksButton({ onPress }: Props) {
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('home.manageCta')}
    >
      <Ionicons name="settings-outline" size={16} color={tokens.text.mid} />
      <Text style={styles.label}>{t('home.manageCta')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: '100%',
    paddingVertical: tokens.space[3] + 2,
    paddingHorizontal: tokens.space[4],
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
  },
  btnPressed: {
    opacity: 0.7,
    borderColor: 'rgba(123, 92, 255, 0.3)',
    backgroundColor: tokens.bg.surface,
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 13,
    color: tokens.text.mid,
  },
});
