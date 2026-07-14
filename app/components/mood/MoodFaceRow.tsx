import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/lib/i18n';
import { MOOD_LEVELS, type MoodValue } from '@/lib/mood';
import { tokens } from '@/theme';

interface Props {
  value: MoodValue | null;
  onSelect: (v: MoodValue) => void;
  size?: 'lg' | 'md';
  showLabels?: boolean;
}

/**
 * The 5-face mood selector shared by the check-in screen, the app-open prompt
 * and (read-only feel) anywhere a scale is shown. One tap = one selection;
 * the selected face fills with its level color, the rest dim.
 */
export function MoodFaceRow({
  value,
  onSelect,
  size = 'lg',
  showLabels = true,
}: Props) {
  const { t } = useT();
  const dim = size === 'lg' ? 56 : 46;
  const emojiSize = size === 'lg' ? 30 : 26;

  return (
    <View style={styles.row}>
      {MOOD_LEVELS.map((lvl) => {
        const active = value === lvl.value;
        const someSelected = value !== null;
        return (
          <Pressable
            key={lvl.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(lvl.value);
            }}
            style={styles.item}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(`mood.levels.${lvl.key}`)}
          >
            <View
              style={[
                styles.circle,
                {
                  width: dim,
                  height: dim,
                  borderRadius: dim / 2,
                  borderColor: `${lvl.color}55`,
                },
                active && {
                  backgroundColor: lvl.color,
                  borderColor: lvl.color,
                  transform: [{ scale: 1.08 }],
                },
                !active && someSelected && styles.dimmed,
              ]}
            >
              <Text style={{ fontSize: emojiSize }}>{lvl.emoji}</Text>
            </View>
            {showLabels && (
              <Text
                style={[
                  styles.label,
                  { color: active ? lvl.color : tokens.text.dim },
                  active && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {t(`mood.levels.${lvl.key}`)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dimmed: {
    opacity: 0.45,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelActive: {
    fontFamily: 'Manrope_800ExtraBold',
  },
});
