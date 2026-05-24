import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

export type AdoptPeriodicityChoice =
  | { kind: 'template_default' }
  | { kind: 'daily' }
  | { kind: 'weekly_3x' }
  | { kind: 'weekly_1x' }
  | { kind: 'one_shot' };

interface Props {
  visible: boolean;
  templateTitle: string;
  /** Template's own task_type — used to highlight the "Manter padrão" suggestion. */
  templateDefaultType?: string;
  onCancel: () => void;
  onConfirm: (choice: AdoptPeriodicityChoice) => void;
}

interface Option {
  choice: AdoptPeriodicityChoice;
  labelKey: string;
  hintKey?: string;
}

const OPTIONS: Option[] = [
  { choice: { kind: 'template_default' }, labelKey: 'adoptSheet.templateDefault', hintKey: 'adoptSheet.templateDefaultHint' },
  { choice: { kind: 'daily' }, labelKey: 'adoptSheet.daily' },
  { choice: { kind: 'weekly_3x' }, labelKey: 'adoptSheet.weekly3x' },
  { choice: { kind: 'weekly_1x' }, labelKey: 'adoptSheet.weekly1x' },
  { choice: { kind: 'one_shot' }, labelKey: 'adoptSheet.oneShot' },
];

/**
 * Bottom-sheet picker shown right before a template is adopted. Lets the user
 * pick the periodicity they want for THIS adoption regardless of the
 * template's default task_type. Stays a UI shortcut on top of the existing
 * "adopt then edit" flow — no extra schema needed.
 */
export function AdoptPeriodicitySheet({
  visible,
  templateTitle,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useT();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>{t('adoptSheet.eyebrow')}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {templateTitle}
          </Text>
          <Text style={styles.body}>{t('adoptSheet.body')}</Text>

          <View style={styles.options}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.choice.kind}
                onPress={() => onConfirm(opt.choice)}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
                hitSlop={4}
              >
                <Text style={styles.optionLabel}>{t(opt.labelKey)}</Text>
                {opt.hintKey && (
                  <Text style={styles.optionHint}>{t(opt.hintKey)}</Text>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={tokens.text.dim}
                />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/** Translate a sheet choice into the override params expected by the
 *  start_task_from_template RPC. Exported so call sites can wire the
 *  mutation directly. */
export function adoptChoiceToOverrides(choice: AdoptPeriodicityChoice): {
  taskTypeOverride?: 'daily' | 'weekly' | 'one_shot';
  recurrenceOverride?: Record<string, unknown> | null;
  targetCountOverride?: number;
} {
  switch (choice.kind) {
    case 'template_default':
      return {};
    case 'daily':
      return {
        taskTypeOverride: 'daily',
        recurrenceOverride: { type: 'daily' },
        targetCountOverride: 1,
      };
    case 'weekly_3x':
      return {
        taskTypeOverride: 'weekly',
        recurrenceOverride: { type: 'weekly' },
        targetCountOverride: 3,
      };
    case 'weekly_1x':
      return {
        taskTypeOverride: 'weekly',
        recurrenceOverride: { type: 'weekly' },
        targetCountOverride: 1,
      };
    case 'one_shot':
      return {
        taskTypeOverride: 'one_shot',
        recurrenceOverride: { type: 'one_shot' },
        targetCountOverride: 1,
      };
  }
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.bg.surface,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    padding: tokens.space[5],
    gap: tokens.space[3],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: tokens.border.strong,
    alignSelf: 'center',
    marginBottom: tokens.space[2],
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.4,
    color: tokens.brand.violet2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: tokens.text.hi,
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.mid,
    lineHeight: 19,
  },
  options: {
    gap: tokens.space[2],
    marginTop: tokens.space[2],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  optionRowPressed: {
    opacity: 0.75,
  },
  optionLabel: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  optionHint: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: tokens.space[3],
    marginTop: tokens.space[2],
  },
  cancelText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.dim,
  },
});
