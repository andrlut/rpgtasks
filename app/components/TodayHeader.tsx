import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinear, Stop } from 'react-native-svg';

import { tokens } from '@/theme';

interface Props {
  /** Display name shown in the eyebrow line — DECO style. */
  displayName: string;
  /** Big headline: weekday word, e.g. "Sunday,". */
  weekdayLabel: string;
  /** Big headline: month + day, e.g. "May 24". Drawn in violet with a glow. */
  monthDayLabel: string;
  /** Tasks completed today — fills the ring proportionally. */
  ringDone: number;
  /** Total tasks contributing to today's closeout. */
  ringTotal: number;
  /** Whether the user has active quests (shows the gold badge dot). */
  hasActiveQuests: boolean;
  onHistoryPress: () => void;
  onQuestsPress: () => void;
  onManagePress: () => void;
}

const RING_SIZE = 52;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * Two-row header for the V3 Tasks home — replaces the old CompactHeader.
 *
 *   Row 1: SUN · MAY 24 · DECO        [📅] [⚔•] [⚙]
 *   Row 2: Sunday, May 24                 [ring 6/7]
 *
 * Eyebrow uses Perceva pale-gold (`coinLight`); the headline's date
 * portion is violet with a textShadow glow to mirror the Rewards card
 * vocabulary. Icons sit in 32×32 tiles on the right.
 */
export function TodayHeader({
  displayName,
  weekdayLabel,
  monthDayLabel,
  ringDone,
  ringTotal,
  hasActiveQuests,
  onHistoryPress,
  onQuestsPress,
  onManagePress,
}: Props) {
  const pct = ringTotal > 0 ? Math.min(1, ringDone / ringTotal) : 0;
  const dashOffset = RING_CIRCUMFERENCE - pct * RING_CIRCUMFERENCE;

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {displayName.toUpperCase()}
        </Text>
        <View style={styles.icons}>
          <IconBtn icon="calendar-outline" onPress={onHistoryPress} />
          <IconBtn
            icon="flash-outline"
            onPress={onQuestsPress}
            badge={hasActiveQuests}
          />
          <IconBtn icon="settings-outline" onPress={onManagePress} />
        </View>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.headline} numberOfLines={1}>
          {weekdayLabel}{' '}
          <Text style={styles.headlineNum}>{monthDayLabel}</Text>
        </Text>

        {ringTotal > 0 && (
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <Defs>
                <SvgLinear id="todayRing" x1="0" y1="0" x2={RING_SIZE} y2={RING_SIZE}>
                  <Stop offset="0%" stopColor={tokens.brand.violet2} />
                  <Stop offset="100%" stopColor={tokens.brand.violet} />
                </SvgLinear>
              </Defs>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="#1e2240"
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="url(#todayRing)"
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.ringNum}>{ringDone}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

interface IconBtnProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: boolean;
}

function IconBtn({ icon, onPress, badge }: IconBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && styles.iconBtnPressed,
      ]}
    >
      <Ionicons name={icon} size={16} color={tokens.text.mid} />
      {badge && <View style={styles.badgeDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[2],
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  eyebrow: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    letterSpacing: 1.6,
    color: tokens.semantic.coinLight,
    textTransform: 'uppercase',
  },
  icons: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  badgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: tokens.semantic.coin,
    borderWidth: 1.5,
    borderColor: tokens.bg.deep,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  headline: {
    flex: 1,
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 26,
    lineHeight: 29,
    color: tokens.text.hi,
    letterSpacing: -0.3,
  },
  headlineNum: {
    color: tokens.brand.violet2,
    textShadowColor: 'rgba(155,130,255,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
    color: tokens.text.hi,
    textShadowColor: 'rgba(155,130,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
