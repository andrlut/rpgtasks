import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

interface Props {
  /** Tasks already completed today (counted toward the ring fill). */
  done: number;
  /** Total tasks for "today" — pending + done. */
  total: number;
  /** Tap the calendar glyph to open History. */
  onHistoryPress?: () => void;
  /** Tap the list glyph to open Manage tasks. */
  onManagePress?: () => void;
}

const SIZE = 64;
const STROKE = 5.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Compact progress ring for the Tasks home — fills as the user completes
 * their daily tasks. Counter inside the ring shows `done/total`; sub-line
 * to the right reads e.g. "3 a fazer · pra fechar o dia".
 *
 * On the right side: optional big-tap-target glyphs for History +
 * Manage tasks. They used to sit in the header eyebrow but tap targets
 * were too small; living next to the ring gives them room to breathe.
 *
 * Hidden entirely when `total === 0` so the empty-state isn't visually
 * noisy on a fresh account.
 */
export function TodayRing({ done, total, onHistoryPress, onManagePress }: Props) {
  const { t } = useT();
  if (total <= 0) return null;
  const remaining = Math.max(0, total - done);
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  const offset = CIRCUMFERENCE - pct * CIRCUMFERENCE;
  const title =
    remaining === 0
      ? t('home.ring.allDone')
      : t('home.ring.toDo', { count: remaining });

  return (
    <View style={styles.row}>
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={tokens.bg.surface}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={tokens.brand.violet}
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.num}>{done}</Text>
          <Text style={styles.den}>/{total}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{t('home.ring.subtitle')}</Text>
      </View>

      {(onHistoryPress || onManagePress) && (
        <View style={styles.actions}>
          {onManagePress && (
            <Pressable
              onPress={onManagePress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('home.manageCta')}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.iconBtnPressed,
              ]}
            >
              <Ionicons name="list-outline" size={22} color={tokens.brand.violet2} />
            </Pressable>
          )}
          {onHistoryPress && (
            <Pressable
              onPress={onHistoryPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('tabs.history')}
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.iconBtnPressed,
              ]}
            >
              <Ionicons name="calendar-outline" size={22} color={tokens.brand.violet2} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[4],
  },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 19,
    color: tokens.text.hi,
    lineHeight: 21,
  },
  den: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    color: tokens.text.dim,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 17,
    color: tokens.text.hi,
    lineHeight: 19,
  },
  sub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.mid,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,92,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123,92,255,0.3)',
  },
  iconBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
