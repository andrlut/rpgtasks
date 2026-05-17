import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { MaterialCover } from '@/components/MaterialCover';
import { ScreenBackground } from '@/components/ScreenBackground';
import {
  useLearningMaterial,
  useMarkMaterialRead,
  useMyMaterialFeedback,
  useRateMaterial,
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
  const myFeedback = useMyMaterialFeedback(slug);
  const rateMaterial = useRateMaterial();
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
  const takeaways = locale === 'pt' ? m.takeaways_pt : m.takeaways_en;
  const signs = locale === 'pt' ? m.signs_pt : m.signs_en;
  const tracking = locale === 'pt' ? m.tracking_pt : m.tracking_en;
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

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Visual hero — full-bleed cover */}
          <View style={styles.heroWrap}>
            <MaterialCover
              dimensionId={m.dimension_id}
              subId={m.subs[0] ?? null}
              imageUrl={m.hero_image_url}
              variant="hero"
            />
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
            </Pressable>
            <View style={styles.heroTypePill}>
              <Text style={styles.heroTypeText}>{typeLabel(m.type, t)}</Text>
            </View>
          </View>

          {/* Title + summary, right under the hero */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>

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

          {/* Takeaways — only render if seeded */}
          {takeaways && takeaways.length > 0 && (
            <View style={styles.takeawaysBox}>
              <View style={styles.takeawaysHeader}>
                <Ionicons name="bulb-outline" size={16} color={tokens.brand.violet2} />
                <Text style={styles.takeawaysTitle}>{t('learning.detail.takeaways')}</Text>
              </View>
              <View style={styles.takeawaysList}>
                {takeaways.map((line, idx) => (
                  <View key={idx} style={styles.takeawayItem}>
                    <View style={styles.takeawayNumWrap}>
                      <Text style={styles.takeawayNum}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.takeawayText}>{line}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Body */}
          <View style={styles.bodyWrap}>
            <LearningBody body={body} />
          </View>

          {/* Signs block — visual replacement for "Signs you're on track" heading */}
          {signs && signs.length > 0 && (
            <View style={[styles.signsBox, { borderColor: dim.color + '55' }]}>
              <View style={styles.signsHeader}>
                <View style={[styles.signsIconWrap, { backgroundColor: dim.bg }]}>
                  <Ionicons name="checkmark-done" size={16} color={dim.color} />
                </View>
                <Text style={[styles.signsTitle, { color: dim.color }]}>
                  {t('learning.detail.signs')}
                </Text>
              </View>
              <View style={styles.signsList}>
                {signs.map((line, idx) => (
                  <View key={idx} style={styles.signItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={dim.color}
                      style={{ marginTop: 3 }}
                    />
                    <Text style={styles.signText}>{line}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tracking block — visual replacement for "How the app tracks it" heading */}
          {tracking && (
            <View style={styles.trackingBox}>
              <View style={styles.trackingHeader}>
                <View style={styles.trackingIconWrap}>
                  <Ionicons name="navigate-circle" size={16} color={tokens.brand.violet2} />
                </View>
                <Text style={styles.trackingTitle}>{t('learning.detail.tracking')}</Text>
              </View>
              <Text style={styles.trackingBody}>{tracking}</Text>
            </View>
          )}

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

          {/* Feedback — 👍/👎 on the material. Stays available after read so
              the user can change their mind. */}
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackPrompt}>{t('learning.detail.feedbackPrompt')}</Text>
            <View style={styles.feedbackRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  rateMaterial.mutate({ slug: m.slug, rating: 1 });
                }}
                style={({ pressed }) => [
                  styles.feedbackBtn,
                  myFeedback.data?.rating === 1 && styles.feedbackBtnActiveUp,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name={myFeedback.data?.rating === 1 ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={18}
                  color={myFeedback.data?.rating === 1 ? tokens.semantic.xp : tokens.text.mid}
                />
                <Text
                  style={[
                    styles.feedbackBtnText,
                    myFeedback.data?.rating === 1 && { color: tokens.semantic.xp },
                  ]}
                >
                  {t('learning.detail.feedbackUp')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  rateMaterial.mutate({ slug: m.slug, rating: -1 });
                }}
                style={({ pressed }) => [
                  styles.feedbackBtn,
                  myFeedback.data?.rating === -1 && styles.feedbackBtnActiveDown,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name={myFeedback.data?.rating === -1 ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={18}
                  color={myFeedback.data?.rating === -1 ? tokens.semantic.danger : tokens.text.mid}
                />
                <Text
                  style={[
                    styles.feedbackBtnText,
                    myFeedback.data?.rating === -1 && { color: tokens.semantic.danger },
                  ]}
                >
                  {t('learning.detail.feedbackDown')}
                </Text>
              </Pressable>
            </View>
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
  scroll: {
    paddingBottom: 120, // clearance for sticky CTA
  },

  // Hero
  heroWrap: {
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  backBtnPressed: { opacity: 0.7 },
  heroTypePill: {
    position: 'absolute',
    top: 18,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroTypeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },

  // Title block (below hero)
  titleBlock: {
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[5],
    paddingBottom: tokens.space[3],
    gap: 8,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 30,
    lineHeight: 36,
    color: tokens.text.hi,
  },
  summary: {
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

  // Takeaways block
  takeawaysBox: {
    marginHorizontal: tokens.space[4],
    marginBottom: tokens.space[5],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    backgroundColor: 'rgba(123, 92, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.28)',
    gap: 10,
  },
  takeawaysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  takeawaysTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: tokens.brand.violet2,
  },
  takeawaysList: {
    gap: 8,
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  takeawayNumWrap: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123, 92, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.42)',
    marginTop: 1,
  },
  takeawayNum: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 11,
    color: tokens.brand.violet2,
  },
  takeawayText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.base,
  },

  bodyWrap: {
    paddingHorizontal: tokens.space[4],
  },

  // Signs block — "you're on track when..."
  signsBox: {
    marginTop: tokens.space[5],
    marginHorizontal: tokens.space[4],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    gap: 10,
  },
  signsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signsIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signsTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  signsList: {
    gap: 6,
  },
  signItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  signText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.base,
  },

  // Tracking block — "how the app tracks this"
  trackingBox: {
    marginTop: tokens.space[4],
    marginHorizontal: tokens.space[4],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    backgroundColor: 'rgba(123, 92, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(123, 92, 255, 0.22)',
    gap: 8,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123, 92, 255, 0.16)',
  },
  trackingTitle: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: tokens.brand.violet2,
  },
  trackingBody: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: tokens.text.base,
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
  feedbackBox: {
    marginTop: tokens.space[5],
    marginHorizontal: tokens.space[4],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    gap: 12,
  },
  feedbackPrompt: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: tokens.text.dim,
    textAlign: 'center',
  },
  feedbackRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  feedbackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: tokens.bg.glassStrong,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  feedbackBtnActiveUp: {
    backgroundColor: 'rgba(61, 214, 140, 0.12)',
    borderColor: tokens.semantic.xp,
  },
  feedbackBtnActiveDown: {
    backgroundColor: 'rgba(255, 92, 122, 0.10)',
    borderColor: tokens.semantic.danger,
  },
  feedbackBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.base,
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
