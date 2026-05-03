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
      <View style={styles.violetGlow} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.bg.deep,
  },
  violetGlow: {
    position: 'absolute',
    top: -120,
    left: '50%',
    width: 320,
    height: 320,
    marginLeft: -160,
    borderRadius: 160,
    backgroundColor: tokens.brand.violet,
    opacity: 0.18,
  },
});
