import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { tokens } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  /** Hero color theme — drives the radial glow and inner gradient. */
  tone?: 'xp' | 'violet' | 'coin';
  iconName?: IconName;
  size?: number;
}

const TONES = {
  xp: {
    glow: tokens.semantic.xpGlow,
    inner: ['#3DD68C', '#2A8F5C'] as [string, string],
    dot: tokens.semantic.xp,
  },
  violet: {
    glow: tokens.brand.violetGlow,
    inner: ['#9B82FF', '#4B2FCC'] as [string, string],
    dot: tokens.brand.violet,
  },
  coin: {
    glow: tokens.semantic.coinGlow,
    inner: ['#FFE08A', '#C8881C'] as [string, string],
    dot: tokens.semantic.coin,
  },
};

const DOT_COUNT = 8;

/**
 * Decorative empty-state illustration. Mirrors the design's "all quests
 * cleared" art: a bright filled circle with a check icon, soft radial halo,
 * and 8 satellite dots ringing it. Pure-View; no SVG.
 */
export function EmptyHero({ tone = 'xp', iconName = 'checkmark', size = 160 }: Props) {
  const t = TONES[tone];
  const ring = size * 0.85;
  const inner = size * 0.55;
  const dotR = size * 0.42;

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <View
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: t.dot,
          },
        ]}
      />
      <View
        style={[
          styles.ring,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            backgroundColor: t.dot,
          },
        ]}
      />
      <LinearGradient
        colors={t.inner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.inner,
          {
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            shadowColor: t.dot,
          },
        ]}
      >
        <Ionicons name={iconName} size={inner * 0.55} color={tokens.text.hi} />
      </LinearGradient>
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const angle = (i / DOT_COUNT) * Math.PI * 2;
        const x = Math.cos(angle) * dotR;
        const y = Math.sin(angle) * dotR;
        return (
          <View
            key={i}
            style={[
              styles.satellite,
              {
                backgroundColor: t.dot,
                left: size / 2 + x - 3,
                top: size / 2 + y - 3,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    opacity: 0.12,
  },
  ring: {
    position: 'absolute',
    opacity: 0.18,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  satellite: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.7,
  },
});
