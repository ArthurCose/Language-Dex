import React, { useState } from "react";
import { StyleSheet, TextStyle, View, Text, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { colors as guessTheWordColors } from "@/src/app/practice/guess-the-word";
import { useTheme } from "@/src/lib/contexts/theme-context";
import usePracticeColors from "@/src/lib/hooks/use-practice-colors";
import {
  SentencePracticeIcon,
  MicrophoneIcon,
} from "@/src/lib/components/icons";
import { Span } from "@/src/lib/components/text";
import { selectionColors } from "@/src/app/practice/word-search";

const READABLE_FONT_SIZE = 3;

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
          const fontSize = h / 4;

          if (fontSize < READABLE_FONT_SIZE) {
            setFontStyle(undefined);
          } else {
            setFontStyle({ fontSize });
          }
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

      {fontStyle != undefined && (
        <Text style={[fontStyle, theme.styles.disabledText]}>
          {t("short_answer_mystery")}
        </Text>
      )}
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
    height: "35%",
    width: "100%",
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
          const iconSize = h * (4 / 5);

          if (iconSize < READABLE_FONT_SIZE) {
            setIconSize(undefined);
          } else {
            setIconSize(iconSize);
          }
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
    borderWidth: 1,
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

const wordSearchBoard = [
  ["X", "X", "X", "X"],
  ["X", "X", "X", "X"],
  ["X", "X", "X", "X"],
  ["X", "X", "X", "X"],
];
const wordSearchSelections = [
  // { x: 0, y: 2, width: 2.5, angle: "45deg" },
  { x: 1, y: 2, width: 4, angle: "-45deg", color: selectionColors[1] },
  { x: 2, y: 0, width: 3, angle: "90deg", color: selectionColors[4] },
  { x: 0, y: 3, width: 4, angle: "0deg", color: selectionColors[3] },
];

export const WordSearchIcon = function () {
  const styles = worSearchStyles;
  const [height, setHeight] = useState(0);

  const cellSize = height / wordSearchBoard.length;

  const fontSize = cellSize * 0.6;
  const fontStyle = fontSize >= READABLE_FONT_SIZE ? { fontSize } : undefined;
  const cellStyle = [styles.cell, fontStyle];

  const selectionStyle: ViewStyle = {
    position: "absolute",
    height: cellSize,
    transformOrigin: [cellSize * 0.5, cellSize * 0.5, 0],
    borderWidth: 1,
    borderRadius: cellSize,
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        e.target.measure((_x, _y, _w, h, _pageX, _pageY) => {
          setHeight(h);
        });
      }}
    >
      {fontStyle &&
        wordSearchBoard.map((row, y) => (
          <View key={y} style={styles.row}>
            {row.map((cell, x) => (
              <Span key={x} style={cellStyle}>
                {cell}
              </Span>
            ))}
          </View>
        ))}

      {wordSearchSelections.map(({ x, y, width, angle, color }, i) => (
        <View
          key={i}
          style={[
            selectionStyle,
            {
              borderColor: color,
              width: cellSize * width,
              transform: [
                { translateX: x * cellSize },
                { translateY: y * cellSize },
                { rotate: angle },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const worSearchStyles = StyleSheet.create({
  container: {
    height: "100%",
    aspectRatio: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    verticalAlign: "middle",
    textAlign: "center",
    padding: 0,
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
          const iconSize = h * (4 / 5);

          if (iconSize < READABLE_FONT_SIZE) {
            setIconSize(undefined);
          } else {
            setIconSize(iconSize);
          }
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
