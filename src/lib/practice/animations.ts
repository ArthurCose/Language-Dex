import { Animated } from "react-native";
import {
  AnimatableValue,
  Easing,
  SharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export const fadeTimingConfig = {
  duration: 500,
  easing: Easing.inOut(Easing.quad),
};

export function flash<T extends AnimatableValue>(
  sharedValue: SharedValue<T>,
  to: T,
  final: T,
): void;

export function flash(
  sharedValue: Animated.Value,
  to: number,
  final: number,
): void;

export function flash<T extends AnimatableValue>(
  sharedValue: SharedValue<T> | Animated.Value,
  to: T,
  final: T,
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
      withTiming(final, fadeTimingConfig),
    );
  }
}

type AnimationEndCallback = (finished: boolean | undefined) => void;
type FadeToOptions =
  | AnimationEndCallback
  | {
      // in ms
      duration?: number;
      callback?: AnimationEndCallback;
    };

export function fadeTo<T extends AnimatableValue>(
  sharedValue: SharedValue<T>,
  final: T,
  options?: FadeToOptions,
): void;

export function fadeTo(
  sharedValue: Animated.Value,
  final: number,
  options?: FadeToOptions,
): void;

export function fadeTo<T extends AnimatableValue>(
  sharedValue: SharedValue<T> | Animated.Value,
  final: T,
  options?: FadeToOptions,
) {
  let callback;

  if (typeof options == "function") {
    callback = options;
    options = undefined;
  } else {
    callback = options?.callback;
  }

  const duration = options?.duration ?? fadeTimingConfig.duration;

  if (sharedValue instanceof Animated.Value) {
    // react native's animated
    Animated.timing(sharedValue, {
      toValue: final as number,
      duration,
      useNativeDriver: true,
    }).start(callback ? ({ finished }) => callback(finished) : undefined);
  } else {
    // reanimated
    const timingConfig = { ...fadeTimingConfig, duration };

    sharedValue.value = withTiming(final, timingConfig, (finished) => {
      if (callback) {
        scheduleOnRN(callback, finished);
      }
    });
  }
}
