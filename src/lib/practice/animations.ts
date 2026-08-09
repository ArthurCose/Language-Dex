import Reanimated, {
  AnimatableValue,
  Easing,
  runOnJS,
  SharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Animated } from "react-native";

export const fadeTimingConfig = {
  duration: 500,
  easing: Easing.inOut(Easing.quad),
};

export function flash<T extends AnimatableValue>(
  sharedValue: SharedValue<T>,
  to: T,
  final: T
): void;

export function flash(
  sharedValue: Animated.Value,
  to: number,
  final: number
): void;

export function flash<T extends AnimatableValue>(
  sharedValue: SharedValue<T> | Animated.Value,
  to: T,
  final: T
) {
  if (sharedValue instanceof Animated.Value) {
    // react native's animated
    Animated.sequence([
      Animated.timing(sharedValue, {
        toValue: to as number,
        duration: fadeTimingConfig.duration,
        useNativeDriver: true,
      }),
      Animated.timing(sharedValue, {
        toValue: final as number,
        duration: fadeTimingConfig.duration,
        useNativeDriver: true,
      }),
    ]).start();
  } else {
    // reanimated
    sharedValue.value = withSequence(
      withTiming(to, fadeTimingConfig),
      withTiming(final, fadeTimingConfig)
    );
  }
}

export function fadeTo<T extends AnimatableValue>(
  sharedValue: SharedValue<T>,
  final: T,
  callback?: (finished: boolean | undefined) => void
): void;

export function fadeTo(
  sharedValue: Animated.Value,
  final: number,
  callback?: (finished: boolean | undefined) => void
): void;

export function fadeTo<T extends AnimatableValue>(
  sharedValue: SharedValue<T> | Animated.Value,
  final: T,
  callback?: (finished: boolean | undefined) => void
) {
  if (sharedValue instanceof Animated.Value) {
    // react native's animated
    Animated.timing(sharedValue, {
      toValue: final as number,
      duration: fadeTimingConfig.duration,
      useNativeDriver: true,
    }).start(callback ? ({ finished }) => callback(finished) : undefined);
  } else {
    // reanimated
    sharedValue.value = withTiming(final, fadeTimingConfig, (finished) => {
      if (callback) {
        runOnJS(callback)(finished);
      }
    });
  }
}
