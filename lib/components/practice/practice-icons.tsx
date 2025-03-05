import React, { useState } from "react";
import { StyleSheet, TextStyle, View, Text } from "react-native";
import { colors as guessTheWordColors } from "@/app/practice/guess-the-word";
import { useTheme } from "@/lib/contexts/theme";
import usePracticeColors from "@/lib/hooks/use-practice-colors";
import { SentencePracticeIcon, MicrophoneIcon } from "../icons";
import { useTranslation } from "react-i18next";

export const ShortAnswerIcon = React.memo(function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const styles = shortAnswerStyles;
  const [fontStyle, setFontStyle] = useState<TextStyle | undefined>();

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        e.target.measure((_x, _y, _w, h, _pageX, _pageY) => {
          setFontStyle({ fontSize: h / 6 });
        });
      }}
    >
      <View
        style={[
          styles.definition,
          theme.styles.borders,
          theme.styles.definitionBackground,
        ]}
      />

      <Text style={[fontStyle, theme.styles.disabledText]}>
        {t("short_answer_mystery")}
      </Text>
    </View>
  );
});

const shortAnswerStyles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 4,
    width: "100%",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  definition: {
    height: "30%",
    width: "50%",
    borderRadius: 5,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    height: "30%",
    gap: 2,
  },
  chip: {
    aspectRatio: 2 / 3,
    borderWidth: 1,
    borderRadius: 3,
  },
});

export const UseInASentenceIcon = React.memo(function () {
  const theme = useTheme();
  const styles = useInASentenceStyles;
  const [iconSize, setIconSize] = useState<number | undefined>();

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        e.target.measure((_x, _y, _w, h, _pageX, _pageY) => {
          setIconSize(h * (4 / 5));
        });
      }}
    >
      {iconSize != undefined && (
        <SentencePracticeIcon
          size={iconSize}
          color={theme.colors.disabledText}
        />
      )}
    </View>
  );
});

const useInASentenceStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
});

export const DefinitionMatchIcon = React.memo(function () {
  const theme = useTheme();
  const styles = definitionMatchStyles;
  const colors = usePracticeColors();
  const cardStyleMap = [
    [styles.card, theme.styles.borders, theme.styles.definitionBackground],
    [styles.card, colors.correct],
  ];

  const rows = [
    [0, 0],
    [0, 1],
    [1, 0],
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((cell, i) => (
            <View key={i} style={cardStyleMap[cell]} />
          ))}
        </View>
      ))}
    </View>
  );
});

const definitionMatchStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    gap: 4,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  card: {
    aspectRatio: 1,
    borderWidth: 1,
  },
});

export const UnscrambleIcon = React.memo(function () {
  const theme = useTheme();
  const styles = unscrambleStyles;
  const colors = usePracticeColors();
  const chipStyleMap = [
    [styles.chip, colors.mistake],
    [styles.chip, colors.correct],
  ];

  const row = [1, 1, 0, 1, 0];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.definition,
          theme.styles.borders,
          theme.styles.definitionBackground,
        ]}
      />

      <View style={styles.row}>
        {row.map((cell, i) => (
          <View key={i} style={chipStyleMap[cell]} />
        ))}
      </View>
    </View>
  );
});

const unscrambleStyles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 4,
    width: "100%",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  definition: {
    height: "30%",
    width: "50%",
    borderRadius: 5,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    height: "30%",
    gap: 2,
  },
  chip: {
    aspectRatio: 2 / 3,
    borderWidth: 1,
    borderRadius: 3,
  },
});

export const GuessTheWordIcon = React.memo(function () {
  const theme = useTheme();
  const styles = guessTheWordStyles;
  const chipStyleMap = [
    [theme.styles.borders, styles.chip, styles.incorrect],
    [theme.styles.borders, styles.chip, styles.incorrectPosition],
    [theme.styles.borders, styles.chip, styles.correct],
  ];

  const rows = [
    [0, 1, 0, 0],
    [0, 0, 2, 1],
    [2, 2, 2],
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((value, i) => (
            <View key={i} style={chipStyleMap[value]} />
          ))}
        </View>
      ))}
    </View>
  );
});

const guessTheWordStyles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: "row",
    flex: 1,
    gap: 2,
  },
  chip: {
    aspectRatio: 3 / 4,
    borderWidth: 2,
  },
  incorrect: {
    backgroundColor: guessTheWordColors.incorrectBackground,
  },
  incorrectPosition: {
    backgroundColor: guessTheWordColors.incorrectPositionBackground,
  },
  correct: {
    backgroundColor: guessTheWordColors.correctBackground,
  },
});

export const CrosswordIcon = React.memo(function () {
  const theme = useTheme();
  const styles = crosswordStyles;
  const cellStyles = [
    styles.cell,
    theme.styles.borders,
    theme.styles.definitionBackground,
  ];
  const cellStyleMap = [[styles.emptyCell], cellStyles, cellStyles];

  const rows = [
    [0, 1],
    [0, 1, 1, 1],
    [1, 1],
    [0, 1, 1],
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((cell, i) => (
            <View key={i} style={cellStyleMap[cell]} />
          ))}
        </View>
      ))}
    </View>
  );
});

const crosswordStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  cell: {
    aspectRatio: 1,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCell: {
    aspectRatio: 1,
  },
});

export const PronunciationIcon = React.memo(function () {
  const theme = useTheme();
  const styles = pronunciationStyles;
  const [iconSize, setIconSize] = useState<number | undefined>();

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        e.target.measure((_x, _y, _w, h, _pageX, _pageY) => {
          setIconSize(h * (4 / 5));
        });
      }}
    >
      {iconSize != undefined && (
        <MicrophoneIcon size={iconSize} color={theme.colors.iconButton} />
      )}
    </View>
  );
});

const pronunciationStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
});
