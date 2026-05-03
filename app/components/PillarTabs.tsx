import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '@/theme';

export type PillarKey = 'avaliacao' | 'dedicacao' | 'skills';

interface Summary {
  /** Headline number, ≤4 chars. */
  kpi: string;
  /** Optional small annotation appended to the KPI ("/5", "XP", "d"). */
  unit?: string;
}

interface Props {
  active: PillarKey;
  onChange: (next: PillarKey) => void;
  avaliacao: Summary;
  dedicacao: Summary;
  skills: Summary;
}

/**
 * Three-segment switcher between the pilares. Each tab carries a headline KPI
 * (what this pillar is "worth" right now) so the user gets a glance-summary
 * even before tapping. Active tab gets a tone-tinted halo so the current
 * mode is unambiguous.
 *
 * Tones map to the feedback registers from docs/three-pillars.md:
 *   - violet  → contemplative (Avaliação)
 *   - xp green → dopaminergic (Dedicação)
 *   - coin gold → ceremonious (Skills)
 */
export function PillarTabs({
  active,
  onChange,
  avaliacao,
  dedicacao,
  skills,
}: Props) {
  return (
    <View style={styles.tabs}>
      <Tab
        keyName="avaliacao"
        active={active === 'avaliacao'}
        accent={tokens.brand.violet2}
        halo="rgba(155, 130, 255, 0.18)"
        border="rgba(155, 130, 255, 0.35)"
        eyebrow="Avaliação"
        kpi={avaliacao.kpi}
        unit={avaliacao.unit}
        onPress={onChange}
      />
      <Tab
        keyName="dedicacao"
        active={active === 'dedicacao'}
        accent={tokens.semantic.xp2}
        halo="rgba(111, 232, 170, 0.18)"
        border="rgba(61, 214, 140, 0.35)"
        eyebrow="Dedicação"
        kpi={dedicacao.kpi}
        unit={dedicacao.unit}
        onPress={onChange}
      />
      <Tab
        keyName="skills"
        active={active === 'skills'}
        accent={tokens.semantic.coin}
        halo="rgba(255, 200, 61, 0.18)"
        border="rgba(255, 200, 61, 0.35)"
        eyebrow="Skills"
        kpi={skills.kpi}
        unit={skills.unit}
        onPress={onChange}
      />
    </View>
  );
}

interface TabProps {
  keyName: PillarKey;
  active: boolean;
  accent: string;
  halo: string;
  border: string;
  eyebrow: string;
  kpi: string;
  unit?: string;
  onPress: (next: PillarKey) => void;
}

function Tab({
  keyName,
  active,
  accent,
  halo,
  border,
  eyebrow,
  kpi,
  unit,
  onPress,
}: TabProps) {
  return (
    <Pressable
      onPress={() => {
        if (!active) Haptics.selectionAsync().catch(() => {});
        onPress(keyName);
      }}
      style={({ pressed }) => [
        styles.tab,
        active && { backgroundColor: halo, borderColor: border },
        pressed && { opacity: 0.85 },
      ]}
      hitSlop={4}
    >
      <Text
        style={[styles.kpi, { color: active ? accent : tokens.text.dim }]}
        numberOfLines={1}
      >
        {kpi}
        {unit ? <Text style={styles.kpiUnit}>{unit}</Text> : null}
      </Text>
      <Text
        style={[styles.eyebrow, { color: active ? accent : tokens.text.dim }]}
        numberOfLines={1}
      >
        {eyebrow.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 4,
    borderRadius: tokens.radius.md,
  },
  tab: {
    flex: 1,
    paddingVertical: tokens.space[2],
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 3,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  kpi: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    lineHeight: 20,
  },
  kpiUnit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.dim,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9.5,
    letterSpacing: 1.2,
    marginTop: 1,
  },
});
