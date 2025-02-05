import React from "react";
import { useTheme } from "@/lib/contexts/theme";
import {
  View,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Span } from "../text";
import { Theme } from "@/lib/themes";
import { Href, router } from "expo-router";
import ListPopup from "../list-popup";

import { definitionMatchModeList } from "@/app/puzzles/[mode]/definition-match";
import { unscrambleModeList } from "@/app/puzzles/[mode]/unscramble";

type GameListingProps = {
  style: StyleProp<ViewStyle>;
  theme: Theme;
} & (
  | {
      href?: undefined;
      modes: string[];
      onSelect: (mode: string) => void;
    }
  | {
      modes?: undefined;
      onSelect?: undefined;
      href?: Href;
    }
) &
  React.PropsWithChildren;

function GameListing({
  style,
  theme,
  href,
  modes,
  onSelect,
  children,
}: GameListingProps) {
  const [t] = useTranslation();

  return (
    <View style={style}>
      {modes ? (
        <ListPopup
          style={styles.pressable}
          android_ripple={theme.ripples.transparentButton}
          list={modes}
          getItemText={(mode) => t("mode_" + mode)}
          keyExtractor={(value) => value}
          centerItems
          onSelect={onSelect}
        >
          <Span>{children}</Span>
        </ListPopup>
      ) : (
        <Pressable
          style={styles.pressable}
          android_ripple={theme.ripples.transparentButton}
          onPress={() => {
            if (href != undefined) {
              router.navigate(href);
            }
          }}
        >
          <Span>{children}</Span>
        </Pressable>
      )}
    </View>
  );
}

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();

  const listingStyles = [theme.styles.gameListing, styles.listing];

  return (
    <View style={styles.list}>
      <View style={styles.row}>
        <GameListing
          style={listingStyles}
          theme={theme}
          modes={definitionMatchModeList}
          onSelect={(mode) =>
            router.navigate(`/puzzles/${mode}/definition-match`)
          }
        >
          {t("Match")}
        </GameListing>

        <GameListing
          style={listingStyles}
          theme={theme}
          modes={unscrambleModeList}
          onSelect={(mode) => router.navigate(`/puzzles/${mode}/unscramble`)}
        >
          {t("Unscramble")}
        </GameListing>
      </View>

      <View style={styles.row}>
        <GameListing style={listingStyles} theme={theme}>
          {t("Crosswords")}
        </GameListing>

        <View style={styles.spacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexWrap: "wrap",
    gap: 4,
    padding: 8,
  },
  row: {
    flexDirection: "row",
    gap: 4,
  },
  listing: {
    flexDirection: "column",
    aspectRatio: 1,
    flexGrow: 1,
    alignItems: "stretch",
    flexBasis: "50%",
  },
  pressable: {
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
  },
  spacer: {
    flexGrow: 1,
    flexBasis: "50%",
  },
});
