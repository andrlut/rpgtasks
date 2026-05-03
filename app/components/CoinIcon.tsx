import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

interface Props {
  size?: number;
}

/**
 * Coin icon — circular gold gradient with a sheen highlight, replacing the
 * flat Ionicons "ellipse" we used as a placeholder. Pure-View (no SVG) so it
 * works without adding a native dep.
 */
export function CoinIcon({ size = 14 }: Props) {
  const sheenW = size * 0.4;
  const sheenH = size * 0.18;
  return (
    <View
      style={[
        styles.root,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <LinearGradient
        colors={['#FFE890', '#FFC83D', '#C8881C']}
        start={{ x: 0.25, y: 0.2 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.sheen,
          {
            top: size * 0.14,
            left: size * 0.18,
            width: sheenW,
            height: sheenH,
            borderRadius: sheenH,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    borderWidth: 0.75,
    borderColor: '#8A5C0F',
  },
  sheen: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ rotate: '-22deg' }],
  },
});
