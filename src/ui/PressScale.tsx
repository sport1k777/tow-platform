import { useState, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const FLEX_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
] as const;

function flexShell(style: StyleProp<ViewStyle>): ViewStyle {
  const flat = StyleSheet.flatten(style);
  const shell: ViewStyle = { alignSelf: 'stretch' };
  if (!flat) {
    return shell;
  }
  for (const key of FLEX_KEYS) {
    const value = flat[key];
    if (value !== undefined) {
      Object.assign(shell, { [key]: value });
    }
  }
  return shell;
}

export function PressScale({ children, style, disabled, onPressIn, onPressOut, ...rest }: Props) {
  const [scale] = useState(() => new Animated.Value(1));

  function animate(to: number) {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 28,
      bounciness: 0,
    }).start();
  }

  return (
    <Animated.View style={[flexShell(style), { transform: [{ scale }] }]}>
      <Pressable
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled) {
            animate(0.97);
          }
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animate(1);
          onPressOut?.(event);
        }}
        style={style}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
