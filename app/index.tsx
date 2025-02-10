import React, { useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View, ViewStyle } from "react-native";
import { useTheme } from "@/lib/contexts/theme";
import TopNav from "@/lib/components/top-nav";
import TopNavDictionaryStack from "@/lib/components/top-nav-dictionary-stack";
import { BottomNav, BottomNavItem } from "@/lib/components/bottom-nav";
import {
  DictionaryIcon,
  StatisticsIcon,
  ScanIcon,
  PuzzleIcon,
} from "@/lib/components/icons";
import { useTranslation } from "react-i18next";
import Animated, {
  runOnJS,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import Dictionary from "@/lib/components/pseudo-pages/dictionary";
import Read from "@/lib/components/pseudo-pages/read";
import Puzzles from "@/lib/components/pseudo-pages/puzzles";
import Statistics from "@/lib/components/pseudo-pages/statistics";
import { useUserDataContext } from "@/lib/contexts/user-data";
import RouteRoot from "@/lib/components/route-root";

type PercentString = `${number}%`;

export const pages = [
  { label: "Dictionary", iconComponent: DictionaryIcon, component: Dictionary },
  { label: "Read", iconComponent: ScanIcon, component: Read },
  { label: "Puzzles", iconComponent: PuzzleIcon, component: Puzzles },
  { label: "Statistics", iconComponent: StatisticsIcon, component: Statistics },
];

export default function () {
  const [userData] = useUserDataContext();
  const [animating, setAnimating] = useState(false);
  const [prevPage, setPrevPage] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(() => {
    const index = pages.findIndex((p) => p.label == userData.home);

    if (index == -1) {
      return 0;
    }

    return index;
  });
  const theme = useTheme();
  const dimensions = useWindowDimensions();
  const [t] = useTranslation();

  // eslint-disable-next-line react/jsx-key
  const pageElements = useMemo(() => pages.map((p) => <p.component />), []);

  const switcherTranslateX = useSharedValue<PercentString>("0%");
  const switcherSlideStyle = useMemo(
    () => ({ transform: [{ translateX: switcherTranslateX }] }),
    [switcherTranslateX]
  );

  const widthStyle = { width: dimensions.width };

  return (
    <RouteRoot>
      <TopNav>
        <TopNavDictionaryStack />
      </TopNav>

      <Animated.View style={[styles.switcher, switcherSlideStyle]}>
        {pageElements.map((element, i) => {
          let pageStyle: ViewStyle | undefined;
          const visible = i == currentPage || (animating && i == prevPage);

          if (!visible) {
            pageStyle = styles.hidden;
          } else if (animating && (prevPage as number) < currentPage) {
            pageStyle = { transform: [{ translateX: "-100%" }] };
          }

          return (
            <View key={i} style={[styles.content, widthStyle, pageStyle]}>
              {element}
            </View>
          );
        })}
      </Animated.View>

      <BottomNav>
        {pages.map((page, i) => (
          <BottomNavItem
            key={i}
            active={i == currentPage}
            label={t(page.label)}
            iconComponent={page.iconComponent}
            theme={theme}
            onPress={() => {
              if (i == currentPage) {
                return;
              }

              setAnimating(true);
              setPrevPage(currentPage);
              setCurrentPage(i);

              let start: PercentString;
              let end: PercentString;

              if (i > currentPage) {
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
            }}
          />
        ))}
      </BottomNav>
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  content: {
    // display: "flex",
    // flexDirection: "column",
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
