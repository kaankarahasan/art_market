import React from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { useThemeContext } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const columnWidth = (width - 44) / 2;

const ProductSkeleton = () => {
  const { colors } = useThemeContext();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Animated.View style={[styles.image, { backgroundColor: colors.border, opacity }]} />
      <View style={styles.content}>
        <Animated.View style={[styles.line, { backgroundColor: colors.border, width: '80%', opacity }]} />
        <Animated.View style={[styles.line, { backgroundColor: colors.border, width: '50%', marginTop: 8, opacity }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: columnWidth,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  content: {
    padding: 12,
  },
  line: {
    height: 14,
    borderRadius: 4,
  },
});

export default ProductSkeleton;
