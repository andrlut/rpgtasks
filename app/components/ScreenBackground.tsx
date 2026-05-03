import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { tokens } from '@/theme';

interface Props {
  children: React.ReactNode;
}

export function ScreenBackground({ children }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={tokens.gradient.screenAmbient}
        locations={tokens.gradient.screenAmbientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.bg.deep,
  },
});
