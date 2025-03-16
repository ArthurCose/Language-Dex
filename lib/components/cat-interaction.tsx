import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useUserDataSignal } from "../contexts/user-data";

let idCounter: number = 0;

type HeartData = {
  id: number;
  startX: number;
  startY: number;
  onComplete: () => void;
};

const Heart = React.memo(function ({ startX, startY, onComplete }: HeartData) {
  const opacity = useSharedValue(1);
  const x = useSharedValue(startX);
  const y = useSharedValue(startY);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    position: "absolute",
    left: x.value,
    top: y.value,
    transform: [{ translateX: "-50%" }, { translateY: "-100%" }],
  }));

  useEffect(() => {
    const despawnSeconds = 0.75;
    const despawnMs = 1000 * despawnSeconds;

    const velX = (Math.random() * 2 - 1) * 30;

    x.value = withTiming(startX + velX * despawnSeconds, {
      easing: Easing.linear,
      duration: despawnMs,
    });

    // float up
    y.value = withTiming(startY - 30, {
      easing: Easing.in(Easing.quad),
      duration: despawnMs,
    });

    opacity.value = withTiming(
      0,
      { easing: Easing.linear, duration: despawnMs },
      () => {
        runOnJS(onComplete)();
      }
    );
  }, []);

  return (
    <Animated.View pointerEvents="none" style={style}>
      <Text>❤️</Text>
    </Animated.View>
  );
});

type Props = { style?: StyleProp<ViewStyle> } & React.PropsWithChildren;

export default function CatInteraction({ style, children }: Props) {
  const [hearts, setHearts] = useState<HeartData[]>([]);
  const [interactionCount, setInteractionCount] = useState(0);
  const userDataSignal = useUserDataSignal();

  useEffect(() => {
    if (hearts.length > 0 || interactionCount == 0) {
      return;
    }

    setInteractionCount(0);

    const userData = userDataSignal.get();
    const previousCount = userData.stats.totalPats ?? 0;

    userDataSignal.set({
      ...userData,
      stats: {
        ...userData.stats,
        totalPats: previousCount + interactionCount,
      },
    });
  }, [hearts]);

  return (
    <Pressable
      style={style}
      onPress={(e) => {
        const id = idCounter++;

        const onComplete = () => {
          setHearts((hearts) => hearts.filter((h) => h.id != id));
        };

        const data = {
          id,
          startX: e.nativeEvent.locationX,
          startY: e.nativeEvent.locationY,
          onComplete,
        };

        setHearts((hearts) => [...hearts, data]);
        setInteractionCount((count) => count + 1);
      }}
    >
      {children}

      {hearts.map((data) => (
        <Heart key={data.id} {...data} />
      ))}
    </Pressable>
  );
}
