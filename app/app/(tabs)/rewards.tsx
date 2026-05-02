import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCharacter } from '@/lib/api/character';
import { tokens } from '@/theme';

export default function RewardsScreen() {
  const character = useCharacter();
  const coins = character.data?.character.coins ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balanceCard}>
          <Ionicons name="ellipse" size={28} color={tokens.semantic.coin} />
          <Text style={styles.balanceValue}>{coins.toLocaleString()}</Text>
          <Text style={styles.balanceLabel}>coins available</Text>
        </View>

        <View style={styles.placeholder}>
          <Ionicons name="gift" size={40} color={tokens.brand.violet2} />
          <Text style={styles.placeholderTitle}>Rewards coming soon</Text>
          <Text style={styles.placeholderSub}>
            In a future update, you will be able to set custom rewards (e.g. 1 hour of gaming for
            50 coins) and redeem them with the coins you have earned.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  content: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[8],
  },
  balanceCard: {
    alignItems: 'center',
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.xl,
    paddingVertical: tokens.space[6],
    gap: tokens.space[2],
    marginTop: tokens.space[3],
    marginBottom: tokens.space[6],
  },
  balanceValue: {
    ...tokens.type.numXl,
    color: tokens.semantic.coin,
  },
  balanceLabel: {
    ...tokens.type.caption,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  placeholder: {
    alignItems: 'center',
    paddingVertical: tokens.space[7],
    paddingHorizontal: tokens.space[6],
    gap: tokens.space[3],
  },
  placeholderTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  placeholderSub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
  },
});
