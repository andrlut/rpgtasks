import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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

import { LearningBody } from '@/components/LearningBody';
import { ScreenBackground } from '@/components/ScreenBackground';
import {
  useLearningMaterial,
  useMarkMaterialRead,
  useReadMaterialIds,
} from '@/lib/api/learning';
import type { LearningMaterialType } from '@/lib/db/types';
import { useT, type TranslateOptions } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { SUB_META } from '@/theme/dimensions';

type Translator = (key: string, options?: TranslateOptions) => string;

function typeLabel(type: LearningMaterialType, t: Translator): string {
  return t(`learning.type.${type}`);
}

export default function MaterialDetailScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const params = useLocalSearchParams<{ slug: string }>();
  const slug = params.slug;

  const material = useLearningMaterial(slug);
  const reads = useReadMaterialIds();
  const markRead = useMarkMaterialRead();
  const meta = useMetaLookup();

  const [busy, setBusy] = useState(false);

  const isRead = useMemo(() => {
    if (!material.data) return false;
    return reads.data?.has(material.data.id) ?? false;
  }, [material.data, reads.data]);

  if (material.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.center}>
            <ActivityIndicator color={tokens.brand.violet2} />
          </View>
        </ScreenBackground>
      </SafeAreaView>
    );
  }

  if (!material.data) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenBackground>
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.center}>
            <Text style={styles.errorTitle}>{t('learning.detail.notFound')}</Text>
            <Pressable style={styles.errorBtn} onPress={() => router.back()}>
              <Text style={styles.errorBtnText}>{t('common.back')}</Text>
            </Pressable>
          </View>
        </ScreenBackground>
      </SafeAreaView>
    );
  }

  const m = material.data;
  const title = locale === 'pt' ? m.title_pt : m.title_en;
  const summary = locale === 'pt' ? m.summary_pt : m.summary_en;
  const body = locale === 'pt' ? m.body_pt : m.body_en;
  const sourceLabel = locale === 'pt' ? m.source_label_pt : m.source_label_en;
  const dim = meta.dim(m.dimension_id);

  // 5 base + 5 per related sub (mirrors the RPC). Displayed as the reward
  // the user is about to claim — actual value is server-authoritative.
  const xpPreview = 5 + 5 * m.subs.length;

  const onMarkRead = async () => {
    if (isRead || busy) return;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await markRead.mutateAsync({ slug: m.slug, materialId: m.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo(t('learning.detail.markFail'), msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
          </Pressable>
          <Text style={styles.topBarTitle}>{typeLabel(m.type, t)}</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Hero — gradient backdrop colored by the material's dim */}
          <LinearGradient
            colors={[dim.bg, 'rgba(36, 42, 88, 0.0)'] as [string, string]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.heroIcon, { backgroundColor: dim.bg, borderColor: dim.color }]}>
              <Ionicons
                name={dim.iconName as keyof typeof Ionicons.glyphMap}
                size={32}
                color={dim.color}
              />
            </View>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSummary}>{summary}</Text>
          </LinearGradient>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { backgroundColor: dim.bg }]}>
              <Ionicons name="time-outline" size={12} color={dim.color} />
              <Text style={[styles.metaPillText, { color: dim.color }]}>
                {t('learning.readMin', { count: m.reading_minutes })}
              </Text>
            </View>
            <View style={[styles.metaPill, { backgroundColor: dim.bg }]}>
              <Ionicons
                name={dim.iconName as keyof typeof Ionicons.glyphMap}
                size={12}
                color={dim.color}
              />
              <Text style={[styles.metaPillText, { color: dim.color }]}>{dim.label}</Text>
            </View>
            {m.subs.map((subId) => {
              const sub = meta.sub(subId);
              return (
                <View key={subId} style={styles.metaPill}>
                  <Ionicons
                    name={SUB_META[subId].iconName as keyof typeof Ionicons.glyphMap}
                    size={12}
                    color={tokens.text.mid}
                  />
                  <Text style={styles.metaPillText}>{sub.label}</Text>
                </View>
              );
            })}
          </View>

          {/* Body */}
          <View style={styles.bodyWrap}>
            <LearningBody body={body} />
          </View>

          {/* Source attribution */}
          {(sourceLabel || m.source_url) && (
            <View style={styles.source}>
              <Text style={styles.sourceLine}>
                <Text style={styles.sourceKey}>{t('learning.detail.source')}: </Text>
                <Text style={styles.sourceVal}>{sourceLabel ?? m.source_url}</Text>
              </Text>
            </View>
          )}

          {/* Reward preview */}
          <View style={styles.rewardCard}>
            {isRead ? (
              <>
                <Ionicons name="checkmark-circle" size={20} color={tokens.semantic.xp} />
                <Text style={styles.rewardReadText}>{t('learning.detail.alreadyRead')}</Text>
              </>
            ) : (
              <>
                <Ionicons name="gift-outline" size={18} color={tokens.brand.violet2} />
                <Text style={styles.rewardText}>
                  {t('learning.detail.rewardPreview', { xp: xpPreview, coins: xpPreview })}
                </Text>
              </>
            )}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={styles.footer}>
          <Pressable
            disabled={isRead || busy}
            onPress={onMarkRead}
            style={({ pressed }) => [
              styles.cta,
              isRead && styles.ctaDone,
              pressed && !isRead && styles.ctaPressed,
            ]}
          >
            {isRead ? (
              <>
                <Ionicons name="checkmark-done" size={18} color={tokens.semantic.xp} />
                <Text style={[styles.ctaText, { color: tokens.semantic.xp }]}>
                  {t('learning.detail.markedRead')}
                </Text>
              </>
            ) : busy ? (
              <ActivityIndicator color={tokens.text.hi} />
            ) : (
              <>
                <Text style={styles.ctaText}>{t('learning.detail.markRead')}</Text>
                <Text style={styles.ctaSubtext}>+{xpPreview} XP · +{xpPreview} 🪙</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[3],
    paddingTop: tokens.space[2],
    paddingBottom: tokens.space[2],
  },
  topBarTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.4,
    color: tokens.text.mid,
    textTransform: 'uppercase',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },
  backBtnPressed: { opacity: 0.7 },
  scroll: {
    paddingBottom: 120, // clearance for sticky CTA
  },
  hero: {
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[6],
    paddingHorizontal: tokens.space[4],
    alignItems: 'flex-start',
    gap: 12,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    lineHeight: 36,
    color: tokens.text.hi,
  },
  heroSummary: {
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 22,
    color: tokens.text.mid,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: tokens.space[4],
    marginTop: -8,
    marginBottom: tokens.space[4],
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: tokens.bg.glassStrong,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  metaPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.mid,
  },
  bodyWrap: {
    paddingHorizontal: tokens.space[4],
  },
  source: {
    marginTop: tokens.space[5],
    marginHorizontal: tokens.space[4],
    padding: tokens.space[3],
    backgroundColor: tokens.bg.glass,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  sourceLine: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.mid,
  },
  sourceKey: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: tokens.text.base,
  },
  sourceVal: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    color: tokens.text.mid,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: tokens.space[5],
    marginHorizontal: tokens.space[4],
    padding: tokens.space[3],
    backgroundColor: tokens.bg.glass,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },
  rewardText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: tokens.text.base,
    flex: 1,
  },
  rewardReadText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    color: tokens.semantic.xp,
    flex: 1,
  },
  errorTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: tokens.text.base,
  },
  errorBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: tokens.brand.violet,
  },
  errorBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.hi,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[3],
    paddingBottom: tokens.space[5],
    backgroundColor: 'rgba(10, 14, 38, 0.92)',
    borderTopWidth: 1,
    borderTopColor: tokens.border.base,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: tokens.brand.violet,
  },
  ctaDone: {
    backgroundColor: 'rgba(61, 214, 140, 0.12)',
    borderWidth: 1,
    borderColor: tokens.semantic.xp,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  ctaSubtext: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
});
