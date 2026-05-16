import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useLastPsychSession } from '@/lib/api/psych';
import { daysSince } from '@/lib/api/questionnaire';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

interface InventoryConfig {
  instrumentId: string;
  i18nKey: 'bigFive' | 'schwartz' | 'ecrr';
  route: Href;
  icon: 'sparkles-outline' | 'star-outline' | 'heart-circle-outline';
  accent: string;
}

const INVENTORIES: InventoryConfig[] = [
  {
    instrumentId: 'big_five_120',
    i18nKey: 'bigFive',
    route: '/big-five',
    icon: 'sparkles-outline',
    accent: tokens.brand.violet2,
  },
  {
    instrumentId: 'schwartz_pvq',
    i18nKey: 'schwartz',
    route: '/schwartz',
    icon: 'star-outline',
    accent: tokens.semantic.coin,
  },
  {
    instrumentId: 'ecr_r',
    i18nKey: 'ecrr',
    route: '/ecr-r',
    icon: 'heart-circle-outline',
    accent: '#FF6B7A',
  },
];

/**
 * Autoconhecimento sub-view (Pilar Percebida). The 3 deeper psychometric
 * inventories (Big Five, Schwartz, ECR-R) surfaced as prominent tap cards
 * — they used to live buried inside /profile-mirror. These do NOT feed
 * the Avaliação hex (different measurement model — personality / values /
 * attachment, not life-area scores).
 */
export function AutoconhecimentoView() {
  const { t } = useT();
  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>{t('autoconhecimento.lead')}</Text>
      <View style={styles.list}>
        {INVENTORIES.map((inv) => (
          <InventoryRow key={inv.instrumentId} config={inv} />
        ))}
      </View>
    </View>
  );
}

function InventoryRow({ config }: { config: InventoryConfig }) {
  const router = useRouter();
  const { t } = useT();
  const lastSession = useLastPsychSession(config.instrumentId);
  const sinceDays = daysSince(lastSession.data?.taken_at ?? null);

  const statusText =
    sinceDays === null
      ? t('autoconhecimento.status.notDone')
      : sinceDays === 0
        ? t('autoconhecimento.status.today')
        : t('autoconhecimento.status.daysAgo', { count: sinceDays });

  const title = t(`autoconhecimento.${config.i18nKey}.title`);
  const subtitle = t(`autoconhecimento.${config.i18nKey}.subtitle`);

  return (
    <Pressable
      onPress={() => router.push(config.route)}
      style={({ pressed }) => [
        styles.row,
        { borderColor: `${config.accent}33` },
        pressed && { opacity: 0.75 },
      ]}
      hitSlop={4}
    >
      <View
        style={[styles.iconBox, { backgroundColor: `${config.accent}1A`, borderColor: `${config.accent}44` }]}
      >
        <Ionicons name={config.icon} size={22} color={config.accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.status}>
        <Text
          style={[
            styles.statusText,
            sinceDays !== null && { color: config.accent },
          ]}
        >
          {statusText}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={tokens.text.dim}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space[3],
  },
  lead: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: tokens.text.dim,
    fontStyle: 'italic',
  },
  list: {
    gap: tokens.space[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
    color: tokens.text.hi,
  },
  subtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    color: tokens.text.dim,
    letterSpacing: 0.2,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    color: tokens.text.mid,
    letterSpacing: 0.3,
  },
});
