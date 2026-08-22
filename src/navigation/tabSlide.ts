import { Animated, useWindowDimensions } from 'react-native';

import { colors, motion } from '@/theme';

export function useTabSlideScreenOptions() {
  const { width } = useWindowDimensions();

  return {
    headerShown: false as const,
    sceneStyle: { backgroundColor: colors.background, flex: 1 },
    animation: 'shift' as const,
    sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({
      sceneStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-width, 0, width],
            }),
          },
        ],
      },
    }),
    transitionSpec: {
      animation: 'timing' as const,
      config: { duration: motion.base },
    },
  };
}
