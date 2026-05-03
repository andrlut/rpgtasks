import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

interface AddCardProps {
  label: string;
  onPress: () => void;
  /** Optional sublabel under the main label. */
  sublabel?: string;
  /** Brand color override. Defaults to violet. */
  tint?: string;
}

/**
 * Inline "+" entry-point card. Replaces floating action buttons that block
 * content underneath. Live at the end of a list so it scrolls naturally with
 * the items it creates.
 */
export function AddCard({
  label,
  onPress,
  sublabel,
  tint = tokens.brand.violet2,
}: AddCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: `${tint}55` },
        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
      ]}
      hitSlop={6}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${tint}1F` }]}>
        <Ionicons name="add" size={20} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={styles.sublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  sublabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.dim,
    marginTop: 2,
  },
});
