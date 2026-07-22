import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoodFace } from '@/components/mood/MoodFace';
import { useT } from '@/lib/i18n';
import { MOOD_LEVELS, type MoodValue } from '@/lib/mood';
import { tokens } from '@/theme';

interface Props {
  value: MoodValue | null;
  onSelect: (v: MoodValue) => void;
  size?: 'lg' | 'md' | 'sm';
  showLabels?: boolean;
}

const FACE_SIZE: Record<NonNullable<Props['size']>, number> = {
  lg: 56,
  md: 46,
  sm: 38,
};

/**
 * The 5-face mood selector shared by the check-in screen, the app-open prompt
 * and the Today-Hub strip. One tap = one selection; the selected face fills
 * with its level color (features in its measured ink — see MoodFace), the
 * rest stay outlined and dim.
 *
 * Selection is carried by four channels, none of them hue: the filled disc,
 * the 1.08 scale bump, the dimming of the other four, and the label weight.
 * Labels stay on `tokens.text.hi` — the two bottom steps of the ramp are
 * fills, and as text on the dark background they measure ~3.2:1.
 */
export function MoodFaceRow({
  value,
  onSelect,
  size = 'lg',
  showLabels = true,
}: Props) {
  const { t } = useT();
  const dim = FACE_SIZE[size];

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
                active && styles.bumped,
                !active && someSelected && styles.dimmed,
              ]}
            >
              <MoodFace value={lvl.value} size={dim} active={active} />
            </View>
            {showLabels && (
              <Text
                style={[
                  styles.label,
                  { color: active ? tokens.text.hi : tokens.text.dim },
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
    justifyContent: 'center',
    gap: 8,
    // 48dp Android touch-target floor. Only bites on size "sm" (38px faces,
    // no labels — the Today-Hub strip); lg/md rows are already taller. RN
    // hitSlop can't rescue a short row: it never extends past parent bounds.
    minHeight: 48,
  },
  bumped: {
    transform: [{ scale: 1.08 }],
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
