import { useEffect, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

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

  const switcherTranslateX = useSharedValue<PercentString>("0%");
  // useAnimatedStyle fixes: "WARN  [Reanimated] Reading from `value` during component render."
  // appears when we directly use switcherTranslateX in a plain object, even without reading `.value`
  const switcherSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: switcherTranslateX.value }],
  }));

  useEffect(() => {
    setCurrentPage(pageIndex);
    setPrevPage(currentPage);

    if (currentPage == pageIndex) {
      return;
    }

    setAnimating(true);

    let start: PercentString;
    let end: PercentString;

    if (pageIndex > currentPage) {
      // moving right
      start = "100%";
      end = "0%";
    } else {
      // moving left
      start = "-100%";
      end = "0%";
    }

    if (!animating) {
      switcherTranslateX.value = start;
    }

    const onComplete = () => {
      setAnimating(false);
    };

    switcherTranslateX.value = withTiming(
      end,
      { duration: 100 },
      (completed) => {
        if (completed) {
          runOnJS(onComplete)();
        }
      }
    );
  }, [pageIndex]);

  return (
    <Animated.View style={[styles.switcher, switcherSlideStyle, style]}>
      {pageElements.map((element, i) => {
        let pageStyle: ViewStyle | undefined;
        const visible = i == currentPage || (animating && i == prevPage);

        if (!visible) {
          pageStyle = styles.hidden;
        } else if (animating && prevPage < currentPage) {
          pageStyle = { transform: [{ translateX: "-100%" }] };
        }

        return (
          <View key={i} style={[styles.content, pageStyle]}>
            {element}
          </View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
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
