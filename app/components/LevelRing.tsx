import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

interface Props {
  size?: number;
  level: number;
  /** 0..1 progress through the current level. Drives the rotated highlight arc. */
  progress?: number;
  children?: React.ReactNode;
}

/**
 * Decorative ring around the avatar — pure-View implementation (no SVG).
 *
 * Visual: solid violet outer ring + soft outer glow + level pill hanging at
 * the bottom. The `progress` prop adds a brighter highlight arc that rotates
 * around the ring proportional to XP-into-level (purely decorative; real
 * progress is shown by the linear ProgressBar inside HeroCard).
 */
export function LevelRing({ size = 80, level, progress = 0, children }: Props) {
  const ringWidth = 4;
  const inner = size - ringWidth * 2;
  const pillTop = size - 8;
  const highlightDeg = progress * 360 - 90;

  return (
    <View style={[styles.root, { width: size, height: size + 14 }]}>
      <View style={[styles.glow, { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2, top: -8, left: -8 }]} />
      <View
        style={[
          styles.track,
          { width: size, height: size, borderRadius: size / 2, borderWidth: ringWidth },
        ]}
      />
      <View
        style={[
          styles.highlightWrap,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate: `${highlightDeg}deg` }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', tokens.brand.violet2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.highlight, { width: size / 2, height: ringWidth, top: 0 }]}
        />
      </View>
      <View
        style={[
          styles.inner,
          { width: inner, height: inner, borderRadius: inner / 2, top: ringWidth, left: ringWidth },
        ]}
      >
        {children}
      </View>
      <LinearGradient
        colors={['#9B82FF', '#5B3CE0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.levelPill, { top: pillTop }]}
      >
        <Text style={styles.levelText}>LV {level}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  glow: {
    position: 'absolute',
    backgroundColor: tokens.brand.violet,
    opacity: 0.35,
  },
  track: {
    position: 'absolute',
    borderColor: tokens.brand.violet,
    shadowColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 6,
  },
  highlightWrap: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'flex-end',
  },
  highlight: {
    position: 'absolute',
    right: 0,
  },
  inner: {
    position: 'absolute',
    backgroundColor: tokens.brand.violetDeep,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  levelPill: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: tokens.brand.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  levelText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.text.hi,
    letterSpacing: 0.5,
  },
});
