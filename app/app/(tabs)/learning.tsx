import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';
import { useT } from '@/lib/i18n';
import { tokens } from '@/theme';

export default function LearningScreen() {
  const { t } = useT();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenBackground>
        <View style={styles.wrap}>
          <View style={styles.card}>
            <View style={styles.iconBox}>
              <Ionicons name="book-outline" size={40} color={tokens.brand.violet2} />
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('learning.badge')}</Text>
            </View>
            <Text style={styles.title}>{t('learning.title')}</Text>
            <Text style={styles.subtitle}>{t('learning.subtitle')}</Text>
            <Text style={styles.body}>{t('learning.body')}</Text>
          </View>
        </View>
      </ScreenBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.deep },
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.layout.bottomNavClearance,
  },
  card: {
    alignItems: 'center',
    gap: 12,
    maxWidth: 340,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 999,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: tokens.bg.glass,
    borderWidth: 1,
    borderColor: tokens.border.strong,
  },
  badgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    color: tokens.brand.violet2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 24,
    color: tokens.text.hi,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: tokens.text.mid,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    color: tokens.text.dim,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },
});
