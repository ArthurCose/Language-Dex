import React, { useState, useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { GameWord, listGameWords, updateStatistics } from "@/lib/data";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { logError } from "@/lib/log";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";
import {
  cloneAndShuffle,
  fadeTo,
  flash,
  getDefinition,
  pluckNBiased,
  Timer,
  useTimerSeconds,
} from "@/lib/puzzles";
import { Theme } from "@/lib/themes";
import { useTheme } from "@/lib/contexts/theme";
import SubMenuTopNav, {
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
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { sharedStyles } from "@/lib/components/puzzles/shared-styles";
import {
  ResultsClock,
  ResultsDialog,
  ResultsLabel,
  ResultsRow,
  ResultsScore,
  ResultsSpacer,
} from "@/lib/components/puzzles/results";

export type DefinitionMatchGameMode = "endless" | "timed" | "rush";
export const definitionMatchModeList: DefinitionMatchGameMode[] = [
  "endless",
  "timed",
  "rush",
];

const TIMED_MAX_S = 60;
const RUSH_MAX_S = 10;

const fadeTimingConfig = {
  duration: 500,
  easing: Easing.inOut(Easing.quad),
};

type GameState = {
  mode: DefinitionMatchGameMode;
  loading: boolean;
  over: boolean;
  displayingResults: boolean;
  bagWords: GameWord[];
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

function setupNextRound(gameState: GameState) {
  const leftWords = pluckNBiased(gameState.bagWords, 3);
  const rightWords = cloneAndShuffle(leftWords);

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
    gameState.bagWords.push(...leftWords);
  }
}

type CardProps = {
  selected: boolean;
  correct: boolean;
  incorrect: boolean;
  theme: Theme;
  onPress: () => void;
} & React.PropsWithChildren;

function Card({
  selected,
  correct,
  incorrect,
  theme,
  onPress,
  children,
}: CardProps) {
  const scale = useSharedValue(1);
  const color = useSharedValue(theme.colors.text);
  const backgroundColor = useSharedValue(theme.colors.definitionBackground);
  const borderColor = useSharedValue(theme.colors.definitionBorder);
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
      borderColor.value = withTiming(theme.colors.definitionBorder, {
        duration: 200,
      });
    }
  }, [selected]);

  useEffect(() => {
    if (correct) {
      // fade to correct colors
      fadeTo(color, sharedStyles.correctText.color);
      fadeTo(backgroundColor, sharedStyles.correctContainer.backgroundColor);
      fadeTo(borderColor, sharedStyles.correctContainer.borderColor);

      scale.value = withTiming(SMALL_SCALE, { duration: 300 });
    } else if (incorrect) {
      // flash incorrect colors
      flash(color, sharedStyles.mistakeText.color, theme.colors.text);
      flash(
        backgroundColor,
        sharedStyles.mistakeContainer.backgroundColor,
        theme.colors.definitionBackground
      );
      flash(
        borderColor,
        sharedStyles.mistakeContainer.borderColor,
        theme.colors.definitionBorder
      );
    } else if (prevCorrect.current) {
      color.value = theme.colors.text;
      backgroundColor.value = theme.colors.definitionBackground;
      borderColor.value = theme.colors.definitionBorder;
      scale.value = 1;
    }

    prevCorrect.current = correct;
  }, [correct, incorrect]);

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
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
  const [t] = useTranslation();
  const [userData, setUserData] = useUserDataContext();
  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
  )!;

  const [allWords, setAllWords] = useState<GameWord[] | null>(null);

  const [gameState, setGameState] = useState<GameState>(() =>
    initGameState([], params.mode as DefinitionMatchGameMode)
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
        updatedGameState.bagWords = [...words];
        setupNextRound(updatedGameState);
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
        setGameState((gameState) => {
          // use setGameState to get the latest data for .over
          if (gameState.over) {
            return gameState;
          }

          gameState.totalTimer.resume();

          if (gameState.maxTime != Infinity) {
            gameState.timer.resume();
          }

          return gameState;
        });
      };

      opacity.value = withTiming(1, fadeTimingConfig, () => {
        runOnJS(endCallback)();
      });
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
        setupNextRound(gameState);
        return gameState;
      });
    };

    // start transition
    opacity.value = withTiming(0, fadeTimingConfig, () => {
      runOnJS(middleCallback)();
    });
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
    setUserData((userData) => {
      userData = updateStatistics(userData, (stats) => {
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

      return userData;
    });
  }, [gameOver]);

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
    <>
      <SubMenuTopNav>
        <SubMenuBackButton />
      </SubMenuTopNav>

      <GameTitle>{t("Match")}</GameTitle>

      {params.mode != "endless" && (
        <ScoreRow>
          <GameClock seconds={gameState.maxTime - seconds} />
          <Score score={gameState.score} />
        </ScoreRow>
      )}

      <Animated.View style={[styles.rows, opacityStyle]}>
        {gameState.rows.map(([left, right], i) => (
          <View key={i} style={styles.row}>
            <Card
              theme={theme}
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
              theme={theme}
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
          onReplay={() => {
            const complete = () => {
              // start next round when everything is cleaned up
              const newState = initGameState([...allWords!], gameState.mode);
              newState.loading = false;
              setupNextRound(newState);
              setGameState(newState);
            };

            // hide current cards
            opacity.value = withTiming(0, fadeTimingConfig, (finished) => {
              if (finished) {
                runOnJS(complete)();
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
    </>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: 12,
    padding: 8,
    flex: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: 24,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
  },
  pressable: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
});
