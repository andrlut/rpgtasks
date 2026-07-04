import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  BigFiveCard,
  DiscCard,
  EcrRCard,
  SchwartzCard,
  StrengthsCard,
  TypesCard,
} from '@/app/profile-mirror';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

/**
 * Autoconhecimento sub-view (Pilar Percebida). Surfaces the 3 deeper
 * psychometric inventories — Big Five, Schwartz Values, ECR-R Attachment —
 * with their full result-summary cards (top-3 values, 5-trait bars,
 * attachment style headline) instead of bare name + status rows.
 *
 * The cards are the same ones rendered in /profile-mirror — reused via
 * export so the answer-preview surface stays consistent and we don't
 * duplicate score-fetching logic.
 *
 * These inventories do NOT feed the Avaliação hex (different measurement
 * model — personality / values / attachment, not life-area scores).
 */
export function AutoconhecimentoView() {
  const router = useRouter();
  const { t } = useT();
  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>{t('autoconhecimento.lead')}</Text>
      <View style={styles.list}>
        <BigFiveCard onOpen={() => router.push('/big-five')} />
        <SchwartzCard onOpen={() => router.push('/schwartz')} />
        <EcrRCard onOpen={() => router.push('/ecr-r')} />
        <DiscCard onOpen={() => router.push('/disc')} />
        <StrengthsCard onOpen={() => router.push('/strengths')} />
        <TypesCard onOpen={() => router.push('/types')} />
      </View>
    </View>
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
    gap: tokens.space[3],
  },
});
