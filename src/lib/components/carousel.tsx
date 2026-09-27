import { useEffect, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  AnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

type PercentString = `${number}%`;

export default function Carousel({
  style,
  pageIndex,
  pageElements,
}: {
  style?: StyleProp<ViewStyle>;
  pageIndex: number;
  pageElements: React.JSX.Element[];
}) {
  const [animating, setAnimating] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(pageIndex);
  const [prevPage, setPrevPage] = useState<number>(pageIndex);

  const progress = useSharedValue(0);
  const toOffset = useSharedValue(0);
  const direction = useSharedValue(0);
  // useAnimatedStyle fixes: "WARN  [Reanimated] Reading from `value` during component render."
  // appears when we directly use switcherTranslateX in a plain object, even without reading `.value`
  const fromStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: `${50 * progress.value * direction.value}%`,
      },
    ],
    opacity: 1 - progress.value,
  }));
  const toStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: `${50 + 50 * (1 - (progress.value + toOffset.value)) * -direction.value}%`,
      },
    ],
    opacity: progress.value,
  }));

  useEffect(() => {
    setCurrentPage(pageIndex);
    setPrevPage(currentPage);

    if (currentPage == pageIndex) {
      return;
    }

    setAnimating(true);

    if (pageIndex > currentPage) {
      // moving right
      direction.set(-1);
      toOffset.set(1);
    } else {
      // moving left
      direction.set(1);
      toOffset.set(-1);
    }

    if (!animating) {
      progress.value = 0;
    }

    const onComplete = () => {
      setAnimating(false);
    };

    progress.value = withTiming(1, { duration: 120 }, (completed) => {
      if (completed) {
        scheduleOnRN(onComplete);
      }
    });
  }, [pageIndex]);

  return (
    <View style={[styles.switcher, style]}>
      {pageElements.map((element, i) => {
        const pageStyles: AnimatedStyle<StyleProp<ViewStyle>>[] = [
          styles.content,
        ];
        const visible = i == currentPage || (animating && i == prevPage);

        if (!visible) {
          pageStyles.push(styles.hidden);
        } else if (animating) {
          if (i == prevPage) {
            pageStyles.push(fromStyle);
          } else {
            pageStyles.push(toStyle);
          }
        }

        return (
          <Animated.View key={i} style={pageStyles}>
            {element}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  switcher: {
    display: "flex",
    flexDirection: "row",
    flex: 1,
  },
  hidden: {
    display: "none",
  },
});
