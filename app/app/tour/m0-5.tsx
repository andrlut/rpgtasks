import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import {
  useActiveTasks,
  useStartTaskFromTemplate,
  useTaskTemplates,
} from '@/lib/api/tasks';
import { useT } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import {
  INITIAL_PICK_SUBS,
  INITIAL_PICK_TARGET,
  INITIAL_PICK_TEMPLATE_IDS,
  SILENT_SEED_TEMPLATE_IDS,
} from '@/lib/tour/constants';
import { useTourStore } from '@/lib/tour/store';
import { showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { SUB_META } from '@/theme/dimensions';

/**
 * M0.5 — Initial 3-task picker. Grid of 12 curated templates (1 per
 * sub). The user must select exactly 3 before "Continuar" enables.
 * "Pular esta etapa" silently adopts the 3 default templates so the
 * Home isn't empty.
 *
 * Templates come from `useTaskTemplates` (already cached client-side);
 * we filter to the 12 ids in INITIAL_PICK_TEMPLATE_IDS and render them
 * in that exact order so the grid stays visually predictable.
 */
export default function TourM0_5Screen() {
  const router = useRouter();
  const { t, locale } = useT();
  const meta = useMetaLookup();
  const templates = useTaskTemplates();
  const activeTasks = useActiveTasks();
  const startFromTemplate = useStartTaskFromTemplate();
  const setStatus = useTourStore((s) => s.setStatus);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // Set of template_ids the user already has — covers the case where
  // they re-enter the tour after already adopting a card (RPC rejects
  // duplicates). Used to disable selection AND to short-circuit the
  // adopt loop.
  const adoptedIds = useMemo(() => {
    const s = new Set<string>();
    for (const task of activeTasks.data ?? []) {
      if (task.template_id) s.add(task.template_id);
    }
    return s;
  }, [activeTasks.data]);

  // Pull the 12 templates in declared order. If a template went missing
  // (catalog rename, etc.), it's just skipped — the picker still works.
  const cards = useMemo(() => {
    const byId = new Map((templates.data ?? []).map((tpl) => [tpl.id, tpl]));
    return INITIAL_PICK_TEMPLATE_IDS.map((id) => byId.get(id)).filter(
      (tpl): tpl is NonNullable<typeof tpl> => !!tpl,
    );
  }, [templates.data]);

  const toggle = (id: string) => {
    if (adoptedIds.has(id)) return; // already adopted — read-only
    Haptics.selectionAsync().catch(() => {});
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < INITIAL_PICK_TARGET) {
        next.add(id);
      } else {
        // At target — refuse to add a 4th. Caller's UI keeps the
        // existing 3 highlighted so it's obvious why the tap was eaten.
      }
      return next;
    });
  };

  /** Extract a useful error message from whatever Supabase / fetch
   *  throws. PostgREST returns `{ message, code, details, hint }`
   *  shaped objects that don't instanceof Error. */
  function describeError(e: unknown): string {
    if (!e) return 'Unknown error';
    if (e instanceof Error) return e.message;
    if (typeof e === 'object') {
      const err = e as Record<string, unknown>;
      return (
        (err.message as string) ||
        (err.details as string) ||
        (err.hint as string) ||
        JSON.stringify(e)
      );
    }
    return String(e);
  }

  const handleContinue = async () => {
    if (selected.size !== INITIAL_PICK_TARGET || busy) return;
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const failures: string[] = [];
    for (const id of selected) {
      // Skip silently if the user already has this template — happens
      // when they reopen the tour after partial adoption.
      if (adoptedIds.has(id)) continue;
      try {
        await startFromTemplate.mutateAsync(id);
      } catch (e) {
        const msg = describeError(e);
        console.warn(`[tour M0.5] adopt ${id} failed:`, msg, e);
        failures.push(`${id}: ${msg}`);
      }
    }
    setBusy(false);
    if (failures.length === selected.size) {
      // Everything failed — surface the first error so the user knows.
      showInfo(t('tour.errors.adopt'), failures[0]!);
      return;
    }
    // At least one adopt landed (or all were already adopted) — proceed.
    await setStatus('M0_5', 'completed');
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    if (busy) return;
    setBusy(true);
    // Only seed defaults when the user actually needs them. If they
    // already have 3+ tasks, leave the list alone — replaying the
    // tour shouldn't churn duplicates. If they have fewer, only seed
    // the defaults they don't already have.
    const taskCount = activeTasks.data?.length ?? 0;
    if (taskCount < INITIAL_PICK_TARGET) {
      for (const id of SILENT_SEED_TEMPLATE_IDS) {
        if (adoptedIds.has(id)) continue;
        try {
          await startFromTemplate.mutateAsync(id);
        } catch {
          // best-effort — duplicates / RLS errors are non-fatal here
        }
      }
    }
    await setStatus('M0_5', 'skipped');
    router.replace('/(tabs)');
  };

  const canContinue = selected.size === INITIAL_PICK_TARGET && !busy;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenBackground withGoldHalo>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('tour.m0_5.eyebrow')}</Text>
          <Text style={styles.title}>{t('tour.m0_5.title')}</Text>
          <Text style={styles.body}>{t('tour.m0_5.body')}</Text>
          <Text style={styles.counter}>
            {t('tour.m0_5.counter', {
              count: selected.size,
              target: INITIAL_PICK_TARGET,
            })}
          </Text>
        </View>

        {templates.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {cards.map((tpl) => {
                const subId = INITIAL_PICK_SUBS[tpl.id] ?? tpl.primary_sub_id;
                const subMeta = meta.sub(subId);
                const dimMeta = meta.dim(SUB_META[subId].dimensionId);
                const isSelected = selected.has(tpl.id);
                const isAdopted = adoptedIds.has(tpl.id);
                const stars = tpl.total_stars ?? 1;
                const title = locale === 'pt' ? tpl.title : tpl.title; // catalog seeds are PT; EN copy is identical for now

                return (
                  <Pressable
                    key={tpl.id}
                    onPress={() => toggle(tpl.id)}
                    disabled={isAdopted}
                    style={({ pressed }) => [
                      styles.card,
                      isSelected && styles.cardSelected,
                      isAdopted && styles.cardAdopted,
                      pressed && !isAdopted && { opacity: 0.85 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={tpl.title}
                  >
                    {isAdopted ? (
                      <View
                        style={[styles.checkBadge, styles.checkBadgeAdopted]}
                      >
                        <Ionicons
                          name="bookmark"
                          size={12}
                          color={tokens.text.hi}
                        />
                      </View>
                    ) : isSelected ? (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                    <View
                      style={[styles.subIcon, { backgroundColor: dimMeta.bg }]}
                    >
                      <Ionicons
                        name={
                          SUB_META[subId]
                            .iconName as keyof typeof Ionicons.glyphMap
                        }
                        size={18}
                        color={dimMeta.color}
                      />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={3}>
                      {title}
                    </Text>
                    <View style={styles.cardFooter}>
                      <Text style={[styles.subLabel, { color: dimMeta.color }]}>
                        {subMeta.label}
                      </Text>
                      <Text style={styles.starText}>
                        {'★'.repeat(stars)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Pressable
            disabled={!canContinue}
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canContinue && styles.primaryBtnDisabled,
              pressed && canContinue && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('tour.m0_5.primary')}
          >
            {busy ? (
              <ActivityIndicator color="#3D2A00" />
            ) : (
              <>
                <Text style={styles.primaryText}>
                  {t('tour.m0_5.primary')}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#3D2A00" />
              </>
            )}
          </Pressable>
          <Pressable
            onPress={handleSkip}
            disabled={busy}
            hitSlop={8}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>
              {t('tour.m0_5.secondary')}
            </Text>
          </Pressable>
        </View>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  header: {
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[3],
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.8,
    color: tokens.semantic.coinLight,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 22,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    color: tokens.text.mid,
    textAlign: 'center',
    maxWidth: 320,
  },
  counter: {
    marginTop: tokens.space[2],
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: tokens.semantic.coinLight,
    letterSpacing: 0.4,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: tokens.space[3],
    paddingBottom: tokens.space[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2] + 2,
    paddingTop: tokens.space[3],
  },
  card: {
    width: '47.5%',
    minHeight: 130,
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    gap: 8,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cardSelected: {
    borderColor: 'rgba(255, 224, 138, 0.55)',
    backgroundColor: 'rgba(255, 200, 61, 0.06)',
  },
  /** Already in the user's list — picked up from a previous tour run
   *  or manual adoption. Read-only, dimmed, with a bookmark badge so
   *  the user can tell the system already has this template tracked. */
  cardAdopted: {
    opacity: 0.45,
    borderColor: tokens.border.base,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: tokens.semantic.coin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeAdopted: {
    backgroundColor: tokens.bg.surface2,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  subIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12.5,
    lineHeight: 16,
    color: tokens.text.hi,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 9,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  starText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.semantic.coinLight,
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: tokens.space[5],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[3],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3] + 2,
    borderRadius: 999,
    backgroundColor: tokens.semantic.coin,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 138, 0.55)',
    minWidth: 200,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: '#3D2A00',
    letterSpacing: 0.4,
  },
  secondaryText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: tokens.text.dim,
    textDecorationLine: 'underline',
  },
});
