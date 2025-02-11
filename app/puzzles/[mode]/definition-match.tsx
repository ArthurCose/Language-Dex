import React, { useState, useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  GameWord,
  listGameWords,
  updateStatistics,
  UserData,
} from "@/lib/data";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { logError } from "@/lib/log";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";
import {
  cloneAndShuffle,
  pickIndexWithLenBiased,
  swapNToEndWith,
} from "@/lib/puzzles/random";
import { getDefinition } from "@/lib/puzzles/definitions";
import { fadeTo, flash } from "@/lib/puzzles/animations";
import { Timer, useTimerSeconds } from "@/lib/puzzles/timer";
import useGettableState from "@/lib/hooks/use-gettable-state";
import { Theme } from "@/lib/themes";
import { useTheme } from "@/lib/contexts/theme";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import {
  GameTitle,
  Score,
  ScoreRow,
  GameClock,
} from "@/lib/components/puzzles/info";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import usePuzzleColors, { PuzzleColors } from "@/lib/hooks/use-puzzle-colors";
import {
  ResultsClock,
  ResultsDialog,
  ResultsLabel,
  ResultsRow,
  ResultsScore,
  ResultsSpacer,
} from "@/lib/components/puzzles/results";
import RouteRoot from "@/lib/components/route-root";
import { useColorScheme } from "@/lib/contexts/color-scheme";
import { SubMenuIconButton } from "@/lib/components/icon-button";
import { PuzzleResultsIcon } from "@/lib/components/icons";

export type DefinitionMatchGameMode = "endless" | "timed" | "rush";
export const definitionMatchModeList: DefinitionMatchGameMode[] = [
  "endless",
  "timed",
  "rush",
];

const TIMED_MAX_S = 60;
const RUSH_MAX_S = 10;

type GameState = {
  mode: DefinitionMatchGameMode;
  loading: boolean;
  over: boolean;
  displayingResults: boolean;
  bagWords: GameWord[];
  bagLen: number;
  rows: [GameWord, GameWord][];
  activeWords: string[];
  leftSelection?: number;
  rightSelection?: number;
  correctSet: Set<GameWord>;
  selectionIncorrect: boolean;
  score: number;
  totalMatched: number;
  roundStarted: boolean;
  streak: boolean;
  timer: Timer;
  totalTimer: Timer;
  maxTime: number;
};

function initGameState(words: GameWord[], mode: DefinitionMatchGameMode) {
  const gameState: GameState = {
    mode,
    loading: true,
    over: false,
    displayingResults: false,
    bagWords: words,
    bagLen: words.length,
    rows: [],
    activeWords: [],
    score: 0,
    totalMatched: 0,
    selectionIncorrect: false,
    correctSet: new Set(),
    streak: false,
    roundStarted: false,
    timer: new Timer(),
    totalTimer: new Timer(),
    maxTime: Infinity,
  };

  if (mode == "rush") {
    gameState.maxTime = RUSH_MAX_S;
  } else if (mode == "timed") {
    gameState.maxTime = TIMED_MAX_S;
  }

  return gameState;
}

function setUpNextRound(gameState: GameState) {
  const leftWords = swapNToEndWith(
    gameState.bagWords,
    gameState.bagLen,
    3,
    pickIndexWithLenBiased
  );
  const rightWords = cloneAndShuffle(leftWords);
  gameState.bagLen -= 3;

  gameState.rows = [];
  gameState.activeWords = [];
  gameState.correctSet.clear();

  for (let i = 0; i < leftWords.length; i++) {
    const leftWord = leftWords[i];
    gameState.rows.push([leftWord, rightWords[i]]);
    gameState.activeWords.push(leftWord.spelling.toLowerCase());
  }

  gameState.leftSelection = undefined;
  gameState.rightSelection = undefined;
  gameState.roundStarted = true;

  if (gameState.mode == "rush") {
    gameState.timer.reset();
  } else if (gameState.mode == "endless") {
    gameState.bagLen = gameState.bagWords.length;
  }
}

function updateGameStats(userData: UserData, gameState: GameState) {
  return updateStatistics(userData, (stats) => {
    stats.definitionsMatched =
      (stats.definitionsMatched ?? 0) + gameState.totalMatched;

    if (!stats.definitionMatchBest) {
      stats.definitionMatchBest = {};
    }

    stats.definitionMatchBest[gameState.mode] = Math.max(
      stats.definitionMatchBest[gameState.mode] ?? 0,
      gameState.score
    );
  });
}

type CardProps = {
  style: StyleProp<ViewStyle>;
  theme: Theme;
  puzzleColors: PuzzleColors;
  selected: boolean;
  correct: boolean;
  incorrect: boolean;
  onPress: () => void;
} & React.PropsWithChildren;

function Card({
  style,
  theme,
  puzzleColors,
  selected,
  correct,
  incorrect,
  onPress,
  children,
}: CardProps) {
  const scale = useSharedValue(1);
  const color = useSharedValue(theme.colors.text);
  const backgroundColor = useSharedValue(theme.colors.definitionBackground);
  const borderColor = useSharedValue(theme.colors.borders);
  const prevCorrect = useRef(correct);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: backgroundColor.value,
    borderColor: borderColor.value,
  }));

  const SMALL_SCALE = 0.95;

  useEffect(() => {
    if (correct) {
      // correct colors and scale are final
      return;
    }

    if (selected) {
      borderColor.value = withTiming(theme.colors.primary.default, {
        duration: 200,
      });
    } else {
      borderColor.value = withTiming(theme.colors.borders, {
        duration: 200,
      });
    }
  }, [selected]);

  useEffect(() => {
    if (correct) {
      // fade to correct colors
      fadeTo(color, puzzleColors.correct.color);
      fadeTo(backgroundColor, puzzleColors.correct.backgroundColor);
      fadeTo(borderColor, puzzleColors.correct.borderColor);

      scale.value = withTiming(SMALL_SCALE, { duration: 300 });
    } else if (incorrect) {
      // flash incorrect colors
      flash(color, puzzleColors.mistake.color, theme.colors.text);
      flash(
        backgroundColor,
        puzzleColors.mistake.backgroundColor,
        theme.colors.definitionBackground
      );
      flash(
        borderColor,
        puzzleColors.mistake.borderColor,
        theme.colors.borders
      );
    } else if (prevCorrect.current) {
      color.value = theme.colors.text;
      backgroundColor.value = theme.colors.definitionBackground;
      borderColor.value = theme.colors.borders;
      scale.value = 1;
    }

    prevCorrect.current = correct;
  }, [correct, incorrect]);

  return (
    <Animated.View style={[style, styles.card, animatedStyle]}>
      <Pressable
        style={styles.pressable}
        onPressIn={onPress}
        disabled={correct}
      >
        <Animated.Text style={{ fontSize: 16, color }}>
          {children}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

export default function () {
  const params = useLocalSearchParams<{ mode: string }>();
  const theme = useTheme();
  const puzzleColors = usePuzzleColors();
  const [t] = useTranslation();
  const [userData, setUserData] = useUserDataContext();
  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
  )!;

  const [allWords, setAllWords] = useState<GameWord[] | null>(null);
  const [cardSizeStyle, setCardSizeStyle] = useState({ width: 0 });

  const [gameState, setGameState, getGameState] = useGettableState<GameState>(
    () => initGameState([], params.mode as DefinitionMatchGameMode)
  );

  const seconds = useTimerSeconds(gameState.timer);

  const definitionMap = useWordDefinitions(
    userData.activeDictionary,
    gameState.activeWords
  );

  useEffect(() => {
    listGameWords(userData.activeDictionary)
      .then((words) => {
        setAllWords(words);

        const updatedGameState = { ...gameState };
        updatedGameState.loading = false;
        updatedGameState.bagWords = words;
        updatedGameState.bagLen = words.length;
        setUpNextRound(updatedGameState);
        setGameState(updatedGameState);
      })
      .catch(logError);
  }, []);

  useEffect(() => {
    // clear incorrect
    if (gameState.selectionIncorrect) {
      setGameState((gameState) => {
        gameState = { ...gameState };
        gameState.selectionIncorrect = false;
        gameState.leftSelection = undefined;
        gameState.rightSelection = undefined;
        return gameState;
      });
    }
  }, [gameState.selectionIncorrect]);

  const opacity = useSharedValue(0);
  const opacityStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // fade in to start the round
  useEffect(() => {
    if (gameState.roundStarted) {
      setGameState((gameState) => ({ ...gameState, roundStarted: false }));

      const endCallback = () => {
        const gameState = getGameState();

        if (gameState.over) {
          return;
        }

        gameState.totalTimer.resume();

        if (gameState.maxTime != Infinity) {
          gameState.timer.resume();
        }
      };

      fadeTo(opacity, 1, endCallback);
    }
  }, [gameState.roundStarted]);

  // fade out and complete the round if everything is correct
  useEffect(() => {
    if (
      gameState.loading ||
      gameState.correctSet.size != gameState.rows.length ||
      gameState.correctSet.size == 0
    ) {
      return;
    }

    // transition to next round
    // pause the time during the transition
    gameState.totalTimer.pause();

    if (gameState.maxTime != Infinity) {
      gameState.timer.pause();
    }

    const middleCallback = () => {
      // setup next round while the board isn't visible
      setGameState((gameState) => {
        gameState = { ...gameState };
        setUpNextRound(gameState);
        return gameState;
      });
    };

    // start transition
    fadeTo(opacity, 0, middleCallback);
  }, [gameState.correctSet.size]);

  const gameOver =
    !gameState.loading &&
    (gameState.activeWords.length == 0 || seconds > gameState.maxTime);

  useEffect(() => {
    if (!gameOver) {
      return;
    }

    gameState.timer.pause();
    gameState.totalTimer.pause();

    setGameState((gameState) => ({
      ...gameState,
      over: true,
      displayingResults: true,
    }));

    // update stats
    setUserData((userData) => updateGameStats(userData, gameState));
  }, [gameOver]);

  useEffect(() => {
    return () => {
      const gameState = getGameState();

      if (!gameState.over) {
        // add unsaved stats
        setUserData((userData) => updateGameStats(userData, gameState));
      }
    };
  }, []);

  if (gameState.loading) {
    return;
  }

  const checkSelection = () => {
    setGameState((gameState) => {
      if (
        gameState.leftSelection == undefined ||
        gameState.rightSelection == undefined
      ) {
        return gameState;
      }

      const leftWord = gameState.rows[gameState.leftSelection][0];
      const rightWord = gameState.rows[gameState.rightSelection][1];

      gameState = { ...gameState };

      if (leftWord != rightWord) {
        // incorrect
        gameState.selectionIncorrect = true;
        gameState.streak = false;
        return gameState;
      }

      // correct
      gameState.correctSet.add(leftWord);
      gameState.totalMatched++;
      gameState.leftSelection = undefined;
      gameState.rightSelection = undefined;

      gameState.score += gameState.streak ? 2 : 1;
      gameState.streak = true;

      return gameState;
    });
  };

  return (
    <RouteRoot>
      <SubMenuTopNav>
        <SubMenuBackButton />

        <SubMenuActions>
          {gameState.over && (
            <SubMenuIconButton
              icon={PuzzleResultsIcon}
              onPress={() =>
                setGameState({ ...gameState, displayingResults: true })
              }
            />
          )}
        </SubMenuActions>
      </SubMenuTopNav>

      <GameTitle>{t("Match")}</GameTitle>

      {params.mode != "endless" && (
        <ScoreRow>
          <GameClock seconds={gameState.maxTime - seconds} />
          <Score score={gameState.score} />
        </ScoreRow>
      )}

      <Animated.View
        style={[styles.rows, opacityStyle]}
        onLayout={(e) => {
          e.target.measure((_x, _y, w, h) => {
            w -= ROWS_PADDING + HORIZONTAL_GAP;
            h -= ROWS_PADDING + VERTICAL_GAP * 2;

            const width = (w - HORIZONTAL_GAP) / 2;
            const height = (h - VERTICAL_GAP) / 2;

            setCardSizeStyle({
              width: Math.min(width, height),
            });
          });
        }}
      >
        {gameState.rows.map(([left, right], i) => (
          <View key={i} style={styles.row}>
            <Card
              style={cardSizeStyle}
              theme={theme}
              puzzleColors={puzzleColors}
              correct={gameState.correctSet.has(left)}
              incorrect={
                gameState.leftSelection == i && gameState.selectionIncorrect
              }
              selected={gameState.leftSelection == i}
              onPress={() => {
                if (gameOver) {
                  return;
                }

                if (gameState.leftSelection == i) {
                  setGameState({ ...gameState, leftSelection: undefined });
                } else {
                  setGameState({ ...gameState, leftSelection: i });
                  checkSelection();
                }
              }}
            >
              {left.spelling}
            </Card>

            <Card
              style={cardSizeStyle}
              theme={theme}
              puzzleColors={puzzleColors}
              correct={gameState.correctSet.has(right)}
              incorrect={
                gameState.rightSelection == i && gameState.selectionIncorrect
              }
              selected={gameState.rightSelection == i}
              onPress={() => {
                if (gameOver) {
                  return;
                }

                if (gameState.rightSelection == i) {
                  setGameState({ ...gameState, rightSelection: undefined });
                } else {
                  setGameState({ ...gameState, rightSelection: i });
                  checkSelection();
                }
              }}
            >
              {getDefinition(definitionMap, right)?.definition}
            </Card>
          </View>
        ))}

        <ResultsDialog
          open={gameState.displayingResults}
          onClose={() =>
            setGameState({ ...gameState, displayingResults: false })
          }
          onReplay={() => {
            const complete = () => {
              // start next round when everything is cleaned up
              const newState = initGameState(allWords!, gameState.mode);
              newState.loading = false;
              setUpNextRound(newState);
              setGameState(newState);
            };

            // hide current cards
            fadeTo(opacity, 0, (finished) => {
              if (finished) {
                complete();
              }
            });

            // close dialog
            const updatedState = { ...gameState };
            updatedState.displayingResults = false;
            setGameState(updatedState);
          }}
        >
          <ResultsRow>
            <ResultsLabel>{t("Score")}</ResultsLabel>
            <ResultsScore score={gameState.score} />
          </ResultsRow>

          <ResultsRow>
            <ResultsLabel>{t("Total_Time")}</ResultsLabel>
            <ResultsClock seconds={gameState.totalTimer.seconds()} />
          </ResultsRow>

          <ResultsSpacer />

          <ResultsRow>
            <ResultsLabel>{t("Top_Score")}</ResultsLabel>
            <ResultsScore
              score={
                dictionary.stats.definitionMatchBest?.[gameState.mode] ?? 0
              }
            />
          </ResultsRow>
        </ResultsDialog>
      </Animated.View>
    </RouteRoot>
  );
}

// used to calculate card size
const HORIZONTAL_GAP = 24;
const VERTICAL_GAP = 12;
const ROWS_PADDING = 16;

const styles = StyleSheet.create({
  rows: {
    flex: 1,
    gap: VERTICAL_GAP,
    padding: ROWS_PADDING,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexShrink: 1,
  },
  card: {
    aspectRatio: 1,
    borderWidth: 1,
  },
  pressable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
