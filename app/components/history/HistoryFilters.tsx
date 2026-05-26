import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import { PeriodSelector } from '@/components/dedicacao/PeriodSelector';
import type { WindowSpec } from '@/lib/api/dedicacao';
import type { HistoryFilters as Filters } from '@/lib/api/dedicacaoHistory';
import type { DimensionId, SubId } from '@/lib/db/types';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { tokens } from '@/theme';
import {
  DIMENSION_META,
  DIMENSION_ORDER,
  SUB_META,
  SUBS_BY_DIM,
} from '@/theme/dimensions';

// Enable native layout animations on Android — needed for the collapsible
// section's smooth open/close. iOS has them on by default.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  spec: WindowSpec;
  onSpecChange: (s: WindowSpec) => void;
  periodLabel: string;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  chipLabels: { week: string; month: string; quarter: string; all: string };
}

const MIN_XP_STEPS = [0, 25, 50, 100];

/**
 * Filter bar for the Dedicação history screen — two layers:
 *
 *   1. Collapsible header chip ("Filtros · N") that opens the drawer
 *      with dim multi-select + sub multi-select + min-XP chips.
 *   2. Period chip selector + ◀ ▶ arrows, always visible at the bottom.
 *
 * The period control lives last in the stack — closest to the heatmap
 * it drives, and the most-used control for moving through time.
 */
export function HistoryFilters({
  spec,
  onSpecChange,
  periodLabel,
  filters,
  onFiltersChange,
  chipLabels,
}: Props) {
  const { locale } = useT();
  const metaLookup = useMetaLookup();
  const [open, setOpen] = useState(false);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync().catch(() => {});
    setOpen((o) => !o);
  };

  const toggleDim = (dim: DimensionId) => {
    Haptics.selectionAsync().catch(() => {});
    const next = new Set(filters.dims);
    if (next.has(dim)) next.delete(dim);
    else next.add(dim);
    onFiltersChange({ ...filters, dims: next });
  };

  const toggleSub = (sub: SubId) => {
    Haptics.selectionAsync().catch(() => {});
    const next = new Set(filters.subs);
    if (next.has(sub)) next.delete(sub);
    else next.add(sub);
    onFiltersChange({ ...filters, subs: next });
  };

  const setMinXp = (n: number) => {
    if (n === filters.minXp) return;
    Haptics.selectionAsync().catch(() => {});
    onFiltersChange({ ...filters, minXp: n });
  };

  const clearAll = () => {
    if (
      filters.dims.size === 0 &&
      filters.subs.size === 0 &&
      filters.minXp === 0
    ) {
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    onFiltersChange({
      ...filters,
      dims: new Set(),
      subs: new Set(),
      minXp: 0,
    });
  };

  const activeCount =
    filters.dims.size + filters.subs.size + (filters.minXp > 0 ? 1 : 0);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggleOpen}
        style={({ pressed }) => [
          styles.toggle,
          open && styles.toggleOpen,
          pressed && { opacity: 0.85 },
        ]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Ionicons
          name="options-outline"
          size={14}
          color={activeCount > 0 ? tokens.brand.violet2 : tokens.text.mid}
        />
        <Text
          style={[
            styles.toggleText,
            activeCount > 0 && { color: tokens.brand.violet2 },
          ]}
        >
          {locale === 'pt' ? 'Filtros' : 'Filters'}
          {activeCount > 0 && ` · ${activeCount}`}
        </Text>
        <View style={styles.toggleSpacer} />
        {activeCount > 0 && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            hitSlop={6}
            style={({ pressed }) => [
              styles.clearBtn,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityLabel={locale === 'pt' ? 'Limpar filtros' : 'Clear filters'}
          >
            <Ionicons
              name="close-circle"
              size={14}
              color={tokens.text.mid}
            />
          </Pressable>
        )}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.text.mid}
        />
      </Pressable>

      {open && (
        <View style={styles.drawer}>
          <Text style={styles.sectionLabel}>
            {locale === 'pt' ? 'DIMENSÕES' : 'DIMENSIONS'}
          </Text>
          <View style={styles.chipWrap}>
            {DIMENSION_ORDER.map((id) => {
              const meta = DIMENSION_META[id];
              const isActive = filters.dims.has(id);
              return (
                <Pressable
                  key={id}
                  onPress={() => toggleDim(id)}
                  style={({ pressed }) => [
                    styles.chip,
                    isActive && {
                      backgroundColor: meta.bg,
                      borderColor: `${meta.color}99`,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityState={isActive ? { selected: true } : {}}
                >
                  <Ionicons
                    name={meta.iconName as never}
                    size={12}
                    color={isActive ? meta.color : tokens.text.dim}
                  />
                  <Text
                    style={[
                      styles.chipLabel,
                      { color: isActive ? meta.color : tokens.text.dim },
                    ]}
                  >
                    {metaLookup.dim(id).label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>SUBS</Text>
          <View style={styles.chipWrap}>
            {DIMENSION_ORDER.flatMap((dim) => SUBS_BY_DIM[dim]).map(
              (subId) => {
                const subMeta = SUB_META[subId];
                const dimMeta = DIMENSION_META[subMeta.dimensionId];
                const isActive = filters.subs.has(subId);
                return (
                  <Pressable
                    key={subId}
                    onPress={() => toggleSub(subId)}
                    style={({ pressed }) => [
                      styles.chip,
                      isActive && {
                        backgroundColor: dimMeta.bg,
                        borderColor: `${dimMeta.color}99`,
                      },
                      pressed && { opacity: 0.85 },
                    ]}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityState={isActive ? { selected: true } : {}}
                  >
                    <Ionicons
                      name={subMeta.iconName as never}
                      size={12}
                      color={isActive ? dimMeta.color : tokens.text.dim}
                    />
                    <Text
                      style={[
                        styles.chipLabel,
                        {
                          color: isActive ? dimMeta.color : tokens.text.dim,
                        },
                      ]}
                    >
                      {metaLookup.sub(subId).label}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>

          <Text style={styles.sectionLabel}>
            {locale === 'pt' ? 'XP MÍNIMO POR ATIVIDADE' : 'MIN XP PER ENTRY'}
          </Text>
          <View style={styles.minXpRow}>
            {MIN_XP_STEPS.map((step) => {
              const isActive = filters.minXp === step;
              return (
                <Pressable
                  key={step}
                  onPress={() => setMinXp(step)}
                  style={({ pressed }) => [
                    styles.minChip,
                    isActive && {
                      backgroundColor: 'rgba(155, 130, 255, 0.18)',
                      borderColor: 'rgba(155, 130, 255, 0.45)',
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityState={isActive ? { selected: true } : {}}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: isActive
                          ? tokens.brand.violet2
                          : tokens.text.dim,
                      },
                    ]}
                  >
                    {step === 0
                      ? locale === 'pt'
                        ? 'Qualquer'
                        : 'Any'
                      : `${step}+`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <PeriodSelector
        spec={spec}
        onChange={onSpecChange}
        label={periodLabel}
        accent={tokens.brand.violet2}
        halo="rgba(155, 130, 255, 0.18)"
        border="rgba(155, 130, 255, 0.35)"
        labels={chipLabels}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space[3],
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  toggleOpen: {
    borderColor: 'rgba(155, 130, 255, 0.35)',
    backgroundColor: 'rgba(155, 130, 255, 0.06)',
  },
  toggleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.mid,
    letterSpacing: 0.3,
  },
  toggleSpacer: { flex: 1 },
  clearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawer: {
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  sectionLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    color: tokens.text.dim,
    letterSpacing: 1.4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  chipLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  minXpRow: {
    flexDirection: 'row',
    gap: 6,
  },
  minChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
});
