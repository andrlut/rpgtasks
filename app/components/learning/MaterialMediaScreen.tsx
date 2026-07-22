import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LearningBody } from '@/components/LearningBody';
import { AudioPane } from '@/components/learning/AudioPane';
import { FeedbackSheet } from '@/components/learning/FeedbackSheet';
import { MediaViewer } from '@/components/learning/MediaViewer';
import { MaterialCover } from '@/components/MaterialCover';
import { ScreenBackground } from '@/components/ScreenBackground';
import {
  type LearningMaterialDetail,
  useMarkMaterialRead,
  useMyMaterialFeedback,
  useRateMaterial,
  useReadMaterialIds,
} from '@/lib/api/learning';
import type { LearningMaterialType } from '@/lib/db/types';
import { useT, type TranslateOptions } from '@/lib/i18n';
import { useMetaLookup } from '@/lib/i18n/meta';
import { learningMediaUrl, pickMedia } from '@/lib/learningMedia';
import { useReadingProgressStore } from '@/lib/readingProgress';
import { showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';
import { SUB_META } from '@/theme/dimensions';

/**
 * Detail experience for materials that carry media attachments (podcast
 * audio / infographic / deck). Renders a book-style hero and a
 * Read | Listen | View mode switcher; materials WITHOUT media keep the
 * original screen in `app/material/[slug].tsx` untouched.
 *
 * The audio player is mounted at screen level the first time Listen is
 * opened and then only hidden on mode switches — playback survives
 * switching to Read/View.
 */

type Translator = (key: string, options?: TranslateOptions) => string;
type Mode = 'read' | 'listen' | 'view';

function typeLabel(type: LearningMaterialType, t: Translator): string {
  return t(`learning.type.${type}`);
}

interface Props {
  detail: LearningMaterialDetail;
}

export function MaterialMediaScreen({ detail: m }: Props) {
  const router = useRouter();
  const { t, locale } = useT();
  const meta = useMetaLookup();

  const reads = useReadMaterialIds();
  const markRead = useMarkMaterialRead();
  const myFeedback = useMyMaterialFeedback(m.slug);
  const rateMaterial = useRateMaterial();

  const [busy, setBusy] = useState(false);
  const [feedbackSheetOpen, setFeedbackSheetOpen] = useState(false);
  const [sheetRating, setSheetRating] = useState<-1 | 1 | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // ── Content per locale (with cross-language fallback for the body) ──────
  const preferredBody = locale === 'pt' ? m.body_pt : m.body_en;
  const otherBody = locale === 'pt' ? m.body_en : m.body_pt;
  const body = preferredBody ?? otherBody;
  const bodyIsFallback = !preferredBody && !!otherBody;

  const title = locale === 'pt' ? m.title_pt : m.title_en;
  const summary = locale === 'pt' ? m.summary_pt : m.summary_en;
  const sourceLabel = locale === 'pt' ? m.source_label_pt : m.source_label_en;
  const takeaways = locale === 'pt' ? m.takeaways_pt : m.takeaways_en;
  const signs = locale === 'pt' ? m.signs_pt : m.signs_en;
  const tracking = locale === 'pt' ? m.tracking_pt : m.tracking_en;
  const dim = meta.dim(m.dimension_id);

  // ── Media picks (locale first, other language as fallback w/ badge) ─────
  const audioPick = useMemo(
    () => pickMedia(m.media, ['audio'], locale === 'pt' ? 'pt' : 'en'),
    [m.media, locale],
  );
  const visualPick = useMemo(
    () => pickMedia(m.media, ['infographic', 'deck'], locale === 'pt' ? 'pt' : 'en'),
    [m.media, locale],
  );

  const modes = useMemo(() => {
    const list: Mode[] = [];
    if (body) list.push('read');
    if (audioPick) list.push('listen');
    if (visualPick) list.push('view');
    return list;
  }, [body, audioPick, visualPick]);

  const [mode, setMode] = useState<Mode>(() => (body ? 'read' : audioPick ? 'listen' : 'view'));
  // Player mounts on first Listen and stays mounted (hidden) afterwards.
  // Starts true when Listen IS the default mode (audio-only material) —
  // otherwise the player would be unreachable with no switcher to tap.
  const [audioActivated, setAudioActivated] = useState(() => !body && !!audioPick);

  const switchMode = (next: Mode) => {
    Haptics.selectionAsync().catch(() => {});
    if (next === 'listen') setAudioActivated(true);
    setMode(next);
  };

  const isRead = useMemo(
    () => reads.data?.has(m.id) ?? false,
    [reads.data, m.id],
  );

  const handleRate = (rating: -1 | 1) => {
    Haptics.selectionAsync().catch(() => {});
    if (myFeedback.data?.rating === rating) {
      rateMaterial.mutate({ slug: m.slug, rating });
      return;
    }
    rateMaterial.mutate({ slug: m.slug, rating });
    setSheetRating(rating);
    setFeedbackSheetOpen(true);
  };

  const handleSheetSave = (tags: string[], comment: string | null) => {
    if (!sheetRating) return;
    rateMaterial.mutate({ slug: m.slug, rating: sheetRating, tags, comment });
    setFeedbackSheetOpen(false);
  };

  // Reading progress only makes sense while actually reading — scrolling
  // past the player must not fabricate a "Continue reading 90%" card.
  const updateProgress = useReadingProgressStore((s) => s.update);
  const lastWriteRef = useRef<number>(0);
  const onContentScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (mode !== 'read') return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const scrollable = contentSize.height - layoutMeasurement.height;
    if (scrollable <= 0) return;
    const percent = (contentOffset.y / scrollable) * 100;
    const now = Date.now();
    if (now - lastWriteRef.current < 500) return;
    lastWriteRef.current = now;
    updateProgress(m.slug, m.id, percent);
  };

  const xpPreview = 5 + 5 * m.subs.length;

  const onMarkRead = async () => {
    if (isRead || busy) return;
    setBusy(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await markRead.mutateAsync({ slug: m.slug, materialId: m.id });
      useReadingProgressStore.getState().clear(m.slug);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      showInfo(t('learning.detail.markFail'), msg);
    } finally {
      setBusy(false);
    }
  };

  const heroUrl = m.hero_image_url;
  const visualUri = visualPick ? learningMediaUrl(visualPick.media.path) : null;
  const visualMeta = visualPick?.media.meta ?? null;
  const visualAspect =
    visualMeta?.width && visualMeta?.height ? visualMeta.width / visualMeta.height : 1080 / 1920;

  const modeIcon: Record<Mode, keyof typeof Ionicons.glyphMap> = {
    read: 'book-outline',
    listen: 'headset-outline',
    view: 'images-outline',
  };
  const modeBadge: Record<Mode, string | null> = {
    read: bodyIsFallback ? (locale === 'pt' ? 'EN' : 'PT') : null,
    listen: audioPick?.isFallback ? audioPick.media.locale.toUpperCase() : null,
    view: visualPick?.isFallback ? visualPick.media.locale.toUpperCase() : null,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenBackground>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          onScroll={onContentScroll}
          scrollEventThrottle={50}
        >
          {/* Book-style hero — the portrait cover floating over itself,
              blurred. Falls back to the generated cover when no art. */}
          <View style={styles.heroWrap}>
            {heroUrl ? (
              <View style={styles.bookHero}>
                <RNImage
                  source={{ uri: heroUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  blurRadius={22}
                />
                <View style={styles.bookHeroDim} />
                <Image
                  source={{ uri: heroUrl }}
                  style={styles.bookCover}
                  contentFit="cover"
                  accessibilityLabel={title}
                />
              </View>
            ) : (
              <MaterialCover
                dimensionId={m.dimension_id}
                subId={m.subs[0] ?? null}
                imageUrl={null}
                variant="hero"
              />
            )}
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={tokens.text.hi} />
            </Pressable>
            <View style={styles.heroTypePill}>
              <Text style={styles.heroTypeText}>{typeLabel(m.type, t)}</Text>
            </View>
          </View>

          {/* Title + summary */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { backgroundColor: dim.bg }]}>
              <Ionicons name="time-outline" size={12} color={dim.color} />
              <Text style={[styles.metaPillText, { color: dim.color }]}>
                {audioPick?.media.duration_seconds && mode === 'listen'
                  ? t('learning.media.listenMin', {
                      count: Math.round(audioPick.media.duration_seconds / 60),
                    })
                  : t('learning.readMin', { count: m.reading_minutes })}
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

          {/* Mode switcher — only the available modes show up */}
          {modes.length > 1 && (
            <View style={styles.modeSwitch}>
              {modes.map((mo) => {
                const active = mode === mo;
                return (
                  <Pressable
                    key={mo}
                    onPress={() => switchMode(mo)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                  >
                    <Ionicons
                      name={modeIcon[mo]}
                      size={15}
                      color={active ? tokens.text.hi : tokens.text.mid}
                    />
                    <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>
                      {t(`learning.mode.${mo}`)}
                    </Text>
                    {modeBadge[mo] && (
                      <View style={styles.modeLangBadge}>
                        <Text style={styles.modeLangBadgeText}>{modeBadge[mo]}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Takeaways — shared across every mode */}
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

          {/* ── Mode content ──────────────────────────────────────────── */}

          {/* Read */}
          {mode === 'read' && body && (
            <View style={styles.bodyWrap}>
              <LearningBody body={body} />
            </View>
          )}

          {/* Listen — mounted once, then hidden so playback survives
              mode switches. */}
          {(audioActivated || mode === 'listen') && audioPick && (
            <View style={mode === 'listen' ? null : styles.hiddenPane}>
              <AudioPane
                uri={learningMediaUrl(audioPick.media.path)}
                fallbackDurationSeconds={audioPick.media.duration_seconds}
                episodeTitle={audioPick.media.meta?.title ?? null}
                langBadge={
                  audioPick.isFallback ? audioPick.media.locale.toUpperCase() : null
                }
              />
            </View>
          )}

          {/* View — inline full infographic; tap opens the zoom viewer. */}
          {mode === 'view' && visualPick && visualUri && (
            <View style={styles.visualWrap}>
              <Pressable
                onPress={() => setViewerOpen(true)}
                accessibilityRole="imagebutton"
                accessibilityLabel={visualMeta?.alt ?? t('learning.media.expand')}
              >
                <Image
                  source={{ uri: visualUri }}
                  style={[styles.visualImage, { aspectRatio: visualAspect }]}
                  contentFit="cover"
                  transition={150}
                />
                <View style={styles.expandHint}>
                  <Ionicons name="expand-outline" size={13} color={tokens.text.hi} />
                  <Text style={styles.expandHintText}>{t('learning.media.expand')}</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* Signs — shared */}
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

          {/* Tracking — shared */}
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

          {/* Source */}
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

          {/* Feedback */}
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackPrompt}>{t('learning.detail.feedbackPrompt')}</Text>
            <View style={styles.feedbackRow}>
              <Pressable
                onPress={() => handleRate(1)}
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
                onPress={() => handleRate(-1)}
                style={({ pressed }) => [
                  styles.feedbackBtn,
                  myFeedback.data?.rating === -1 && styles.feedbackBtnActiveDown,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name={myFeedback.data?.rating === -1 ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={18}
                  color={
                    myFeedback.data?.rating === -1 ? tokens.semantic.danger : tokens.text.mid
                  }
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
            {myFeedback.data && (myFeedback.data.tags.length > 0 || myFeedback.data.comment) && (
              <Pressable
                onPress={() => {
                  setSheetRating(myFeedback.data!.rating);
                  setFeedbackSheetOpen(true);
                }}
                style={({ pressed }) => [styles.feedbackEditRow, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="create-outline" size={13} color={tokens.text.mid} />
                <Text style={styles.feedbackEditText}>{t('learning.feedback.editExisting')}</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.footer, { paddingBottom: tokens.space[3] }]}>
          <Pressable
            disabled={isRead || busy}
            onPress={onMarkRead}
            style={({ pressed }) => [
              styles.cta,
              isRead && styles.ctaDone,
              pressed && !isRead && { opacity: 0.85 },
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
                <Text style={styles.ctaSubtext}>
                  +{xpPreview} XP · +{xpPreview} 🪙
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <FeedbackSheet
          open={feedbackSheetOpen}
          rating={sheetRating}
          initialTags={myFeedback.data?.tags ?? []}
          initialComment={myFeedback.data?.comment ?? null}
          onClose={() => setFeedbackSheetOpen(false)}
          onSave={handleSheetSave}
        />

        {visualUri && (
          <MediaViewer
            open={viewerOpen}
            uri={visualUri}
            width={visualMeta?.width ?? null}
            height={visualMeta?.height ?? null}
            alt={visualMeta?.alt ?? null}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  scroll: {
    paddingBottom: 120, // clearance for sticky CTA
  },

  // Hero
  heroWrap: {
    position: 'relative',
  },
  bookHero: {
    width: '100%',
    height: 264,
    overflow: 'hidden',
    backgroundColor: '#1A1F44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookHeroDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 38, 0.45)',
  },
  bookCover: {
    width: 136,
    height: 204,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
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

  // Title block
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

  // Mode switcher
  modeSwitch: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: tokens.space[4],
    marginBottom: tokens.space[5],
    padding: 4,
    borderRadius: 999,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.base,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 999,
  },
  modeBtnActive: {
    backgroundColor: tokens.brand.violet,
  },
  modeBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: tokens.text.mid,
  },
  modeBtnTextActive: {
    color: tokens.text.hi,
  },
  modeLangBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  modeLangBadgeText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8,
    letterSpacing: 0.5,
    color: tokens.text.hi,
  },
  hiddenPane: {
    display: 'none',
  },

  // Takeaways
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
  takeawaysList: { gap: 8 },
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

  // Visual pane
  visualWrap: {
    marginHorizontal: tokens.space[4],
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },
  visualImage: {
    width: '100%',
  },
  expandHint: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  expandHintText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.hi,
  },

  // Signs
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
  signsList: { gap: 6 },
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

  // Tracking
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
  feedbackEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingTop: 8,
  },
  feedbackEditText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    color: tokens.text.mid,
    letterSpacing: 0.3,
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
