import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { TierName } from '@/lib/db/types';
import { tokens } from '@/theme';

/**
 * Per-tier visual recipe — outer ring color, inner gradient, glow color, and
 * how many chevrons to engrave inside the medal. Mirrors the design's
 * geometric tier badge: beginner → bronze → silver → gold → master.
 */
const TIER: Record<
  TierName,
  {
    ring: string;
    inner: readonly [string, string];
    glow: string;
    chevrons: number;
    label: string;
    chevronColor: string;
  }
> = {
  beginner: {
    ring: tokens.tier.beginner,
    inner: ['#B8BDE0', '#5C638F'] as const,
    glow: 'rgba(155, 160, 200, 0.5)',
    chevrons: 0,
    label: 'Beginner',
    chevronColor: 'rgba(0,0,0,0.4)',
  },
  bronze: {
    ring: tokens.tier.bronze2,
    inner: ['#F2B27A', '#A85B26'] as const,
    glow: 'rgba(230, 149, 89, 0.55)',
    chevrons: 1,
    label: 'Bronze',
    chevronColor: 'rgba(50,20,0,0.55)',
  },
  silver: {
    ring: tokens.tier.silver2,
    inner: ['#F4F6FF', '#7B85B8'] as const,
    glow: 'rgba(232, 236, 255, 0.5)',
    chevrons: 2,
    label: 'Silver',
    chevronColor: 'rgba(50,55,100,0.55)',
  },
  gold: {
    ring: tokens.tier.gold2,
    inner: ['#FFEFB0', '#E0A52B'] as const,
    glow: 'rgba(255, 200, 61, 0.65)',
    chevrons: 3,
    label: 'Gold',
    chevronColor: 'rgba(60,30,0,0.55)',
  },
  master: {
    ring: tokens.tier.master2,
    inner: ['#C2A1FF', '#FFC83D'] as const,
    glow: 'rgba(155, 130, 255, 0.7)',
    chevrons: 4,
    label: 'Master',
    chevronColor: 'rgba(0,0,0,0.4)',
  },
};

interface Props {
  tier: TierName;
  size?: number;
  /** Render with full glow + saturation. False = dim "locked" appearance. */
  active?: boolean;
  showLabel?: boolean;
}

export function TierMedal({ tier, size = 56, active = true, showLabel = false }: Props) {
  const t = TIER[tier];
  const ringW = Math.max(2, size * 0.06);
  const innerSize = size - ringW * 2;
  const chevronW = innerSize * 0.44;
  const chevronH = Math.max(2, size * 0.045);
  const chevronGap = innerSize * 0.13;

  return (
    <View style={{ alignItems: 'center', gap: 4, opacity: active ? 1 : 0.45 }}>
      <View
        style={[
          styles.outer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowColor: t.glow,
            shadowOpacity: active ? 0.9 : 0,
            shadowRadius: size * 0.25,
            elevation: active ? 10 : 0,
          },
        ]}
      >
        {/* Outer ring */}
        <View
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: size / 2,
            backgroundColor: t.ring,
          }}
        />
        {/* Inner gradient face */}
        <LinearGradient
          colors={t.inner}
          start={{ x: 0.3, y: 0.1 }}
          end={{ x: 0.85, y: 1 }}
          style={{
            position: 'absolute',
            top: ringW,
            left: ringW,
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Top sheen highlight */}
          <View
            style={{
              position: 'absolute',
              top: innerSize * 0.08,
              left: innerSize * 0.18,
              width: innerSize * 0.6,
              height: innerSize * 0.18,
              borderRadius: innerSize * 0.15,
              backgroundColor: 'rgba(255,255,255,0.4)',
              transform: [{ rotate: '-18deg' }],
            }}
          />
          {/* Chevrons */}
          <View
            style={{
              alignItems: 'center',
              gap: chevronGap,
              marginTop: t.chevrons === 0 ? 0 : -chevronH,
            }}
          >
            {Array.from({ length: t.chevrons }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: chevronW,
                  height: chevronH * 2,
                  borderTopWidth: chevronH,
                  borderTopColor: t.chevronColor,
                  borderLeftWidth: chevronW / 2,
                  borderRightWidth: chevronW / 2,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomWidth: chevronH,
                  borderBottomColor: 'transparent',
                  marginTop: -chevronH,
                }}
              />
            ))}
            {t.chevrons === 0 && (
              <View
                style={{
                  width: innerSize * 0.18,
                  height: innerSize * 0.18,
                  borderRadius: innerSize * 0.09,
                  backgroundColor: t.chevronColor,
                }}
              />
            )}
            {tier === 'master' && (
              <View
                style={{
                  position: 'absolute',
                  width: innerSize * 0.32,
                  height: innerSize * 0.32,
                  top: innerSize * 0.34,
                  left: innerSize * 0.34 - ringW,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  transform: [{ rotate: '45deg' }],
                  borderRadius: 4,
                }}
              />
            )}
          </View>
        </LinearGradient>
      </View>
      {showLabel && (
        <Text
          style={{
            fontFamily: 'Manrope_800ExtraBold',
            fontSize: Math.max(9, size * 0.18),
            color: tokens.text.mid,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {t.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    shadowOffset: { width: 0, height: 0 },
  },
});
