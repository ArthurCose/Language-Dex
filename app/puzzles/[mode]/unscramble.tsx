import React, { useEffect, useState } from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { useUserDataContext } from "@/lib/contexts/user-data";
import {
  GameWord,
  listGameWords,
  updateStatistics,
  UserData,
} from "@/lib/data";
import { logError } from "@/lib/log";
import { useLocalSearchParams } from "expo-router";
import {
  cloneAndShuffle,
  pickIndexWithLenBiased,
  swapToEnd,
  shuffle,
  swap,
} from "@/lib/puzzles/random";
import { fadeTo, flash } from "@/lib/puzzles/animations";
import { Timer, useTimerSeconds } from "@/lib/puzzles/timer";
import useGettableState from "@/lib/hooks/use-gettable-state";
import Unistring, { Grapheme } from "@akahuku/unistring";
import SubMenuTopNav, {
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import {
  GameClock,
  GameTitle,
  Score,
  ScoreRow,
} from "@/lib/components/puzzles/info";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";
import { Span } from "@/lib/components/text";
import CircleButton from "@/lib/components/circle-button";
import { ArrowRightIcon, ShuffleIcon } from "@/lib/components/icons";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureStateChangeEvent,
  PanGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import { Portal } from "@rn-primitives/portal";
import uuid from "react-native-uuid";
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

export type UnscrambleGameMode = "endless" | "timed" | "rush";
export const unscrambleModeList: UnscrambleGameMode[] = [
  "endless",
  "timed",
  "rush",
];

const TIMED_MAX_S = 60;
const RUSH_MAX_S = 10;

type GameState = {
  mode: UnscrambleGameMode;
  loading: boolean;
  over: boolean;
  displayingResults: boolean;
  bagWords: GameWord[];
  bagLen: number;
  activeWord?: GameWord;
  activeWords: string[];
  graphemes: Grapheme[];
  graphemeBoxes: ({ x: number; y: number; w: number; h: number } | undefined)[];
  graphemeInteraction: boolean;
  graphemeSelected?: number;
  correctList?: boolean[];
  allCorrect: boolean;
  score: number;
  totalUnscrambled: number;
  roundStarted: boolean;
  streak: boolean;
  timer: Timer;
  totalTimer: Timer;
  maxTime: number;
};

function initGameState(words: GameWord[], mode: UnscrambleGameMode) {
  const gameState: GameState = {
    mode,
    loading: true,
    over: false,
    displayingResults: false,
    bagWords: words,
    bagLen: words.length,
    activeWords: [],
    graphemes: [],
    graphemeBoxes: [],
    graphemeInteraction: false,
    allCorrect: false,
    score: 0,
    totalUnscrambled: 0,
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
  const bagIndex = pickIndexWithLenBiased(gameState.bagLen);
  gameState.activeWord = swapToEnd(
    gameState.bagWords,
    gameState.bagLen,
    bagIndex
  );
  gameState.bagLen -= 1;

  gameState.graphemes = [];
  gameState.graphemeSelected = undefined;
  gameState.graphemeInteraction = false;
  gameState.correctList = undefined;
  gameState.allCorrect = false;

  if (!gameState.activeWord) {
    gameState.activeWords = [];
    return;
  }

  gameState.activeWords = [gameState.activeWord.spelling.toLowerCase()];

  Unistring(gameState.activeWord.spelling).forEach((grapheme) => {
    gameState.graphemes.push(grapheme);
  });

  while (
    gameState.graphemes.map((g) => g.rawString).join("") ==
    gameState.activeWord.spelling
  ) {
    shuffle(gameState.graphemes);
  }

  if (gameState.mode == "rush") {
    gameState.timer.reset();
  } else if (gameState.mode == "endless") {
    gameState.bagWords.push(gameState.activeWord);
  }

  gameState.roundStarted = true;
}

function updateGameStats(userData: UserData, gameState: GameState) {
  return updateStatistics(userData, (stats) => {
    stats.unscrambled = (stats.unscrambled ?? 0) + gameState.totalUnscrambled;

    if (!stats.unscrambleBest) {
      stats.unscrambleBest = {};
    }

    stats.unscrambleBest[gameState.mode] = Math.max(
      stats.unscrambleBest[gameState.mode] ?? 0,
      gameState.score
    );
  });
}

function overlappingGraphemeIndex(gameState: GameState, x: number, y: number) {
  for (let i = 0; i < gameState.graphemes.length; i++) {
    const p = gameState.graphemeBoxes[i];

    if (!p) {
      continue;
    }

    // half height
    const hh = p.h / 2;

    if (x >= p.x && x <= p.x + p.w && y >= p.y - hh && y <= p.y + p.h + hh) {
      return i;
    }
  }
}

type ChipSlotProps = {
  index: number;
  puzzleColors: PuzzleColors;
  gameState: GameState;
  setGameState: (gameState: GameState) => void;
  getGameState: () => GameState;
  opacity: SharedValue<number>;
} & React.PropsWithChildren;

const springConfig = {
  mass: 0.2,
  damping: 22,
};

function ChipSlot({
  index,
  puzzleColors,
  gameState,
  setGameState,
  getGameState,
  opacity,
  children,
}: ChipSlotProps) {
  const theme = useTheme();
  const interacting = useSharedValue(false);
  const originalPos = useSharedValue({ x: 0, y: 0 });
  const position = useSharedValue({ x: 0, y: 0 });
  const [portalName] = useState(() => uuid.v4());
  const color = useSharedValue(theme.colors.text);
  const backgroundColor = useSharedValue(theme.colors.definitionBackground);
  const borderColor = useSharedValue(theme.colors.borders);

  const selected = gameState.graphemeSelected == index;

  const animatedStyle = useAnimatedStyle(() => {
    const moving =
      position.value.x != originalPos.value.x ||
      position.value.y != originalPos.value.y;

    return {
      position: "absolute",
      left: position.value.x,
      top: position.value.y,
      zIndex: moving || interacting.value ? 1 : 0,
      borderColor: selected ? theme.colors.primary.default : borderColor.value,
      color: color.value,
      backgroundColor: backgroundColor.value,
      opacity: opacity.value,
    };
  }, [selected]);

  // highlight on correctness check
  useEffect(() => {
    if (!gameState.correctList) {
      return;
    }

    let targetColor;
    let targetBackgroundColor;
    let targetBorderColor;

    if (gameState.correctList[index]) {
      // correct colors
      targetColor = puzzleColors.correct.color;
      targetBackgroundColor = puzzleColors.correct.backgroundColor;
      targetBorderColor = puzzleColors.correct.borderColor;
    } else {
      // incorrect colors
      targetColor = puzzleColors.mistake.color;
      targetBackgroundColor = puzzleColors.mistake.backgroundColor;
      targetBorderColor = puzzleColors.mistake.borderColor;
    }

    flash(color, targetColor, theme.colors.text);
    flash(
      backgroundColor,
      targetBackgroundColor,
      theme.colors.definitionBackground
    );
    flash(borderColor, targetBorderColor, theme.colors.borders);
  }, [gameState.correctList]);

  const beginGesture = () => {
    const gameState = getGameState();

    if (gameState.graphemeInteraction) {
      return;
    }

    interacting.value = true;
    setGameState({ ...gameState, graphemeInteraction: true });
  };

  const startGesture = () => {
    if (interacting.value) {
      setGameState({ ...gameState, graphemeSelected: undefined });
    }
  };

  const finalizedGesture = (
    e: GestureStateChangeEvent<PanGestureHandlerEventPayload>,
    dragged: boolean
  ) => {
    if (!interacting.value) {
      return;
    }

    const gameState = { ...getGameState(), graphemeInteraction: false };

    if (dragged) {
      const i = overlappingGraphemeIndex(gameState, e.absoluteX, e.absoluteY);

      if (i != undefined) {
        gameState.graphemes = [...gameState.graphemes];
        swap(gameState.graphemes, index, i);
      }
    } else if (gameState.graphemeSelected != undefined) {
      gameState.graphemes = [...gameState.graphemes];
      swap(gameState.graphemes, index, gameState.graphemeSelected);
      gameState.graphemeSelected = undefined;
    } else {
      gameState.graphemeSelected = index;
    }

    position.value = withSpring(originalPos.value, springConfig);
    interacting.value = false;

    setGameState(gameState);
  };

  const gesture = Gesture.Pan()
    .onBegin(() => runOnJS(beginGesture)())
    .onStart(() => runOnJS(startGesture)())
    .onUpdate((e) => {
      if (interacting.value) {
        position.value = {
          x: e.translationX + originalPos.value.x,
          y: e.translationY + originalPos.value.y,
        };
      }
    })
    .onFinalize((e, success) => runOnJS(finalizedGesture)(e, success));

  return (
    <View
      style={[styles.slot, { backgroundColor: theme.colors.borders }]}
      onLayout={(e) => {
        e.target.measure((_x, _y, w, h, pageX, pageY) => {
          const p = { x: pageX, y: pageY };

          if (originalPos.value.x == 0 && originalPos.value.y == 0) {
            position.value = p;
          } else {
            position.value = withSpring(p, springConfig);
          }

          originalPos.value = p;

          // not using setGameState, since we're modifying directly
          gameState.graphemeBoxes[index] = {
            x: pageX,
            y: pageY,
            w,
            h,
          };
        });
      }}
    >
      <Portal name={portalName}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.chip, animatedStyle]}>
            <Animated.Text
              style={[styles.chipText, theme.styles.text, { color }]}
            >
              {children}
            </Animated.Text>
          </Animated.View>
        </GestureDetector>
      </Portal>
    </View>
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
  const [gameState, setGameState, getGameState] = useGettableState(() =>
    initGameState([], params.mode as UnscrambleGameMode)
  );

  const definitionMap = useWordDefinitions(
    userData.activeDictionary,
    gameState.activeWords
  );

  const seconds = useTimerSeconds(gameState.timer);

  useEffect(() => {
    listGameWords(userData.activeDictionary, { minLength: 2 })
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

  const opacity = useSharedValue(0);
  const opacityStyle: StyleProp<ViewStyle> = useAnimatedStyle(() => ({
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
    if (gameState.loading || !gameState.allCorrect) {
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
  }, [gameState.allCorrect]);

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
    if (gameState.allCorrect) {
      return;
    }

    setGameState((gameState) => {
      if (!gameState.activeWord) {
        return gameState;
      }

      const correctList: boolean[] = [];
      gameState.allCorrect = true;

      Unistring(gameState.activeWord.spelling).forEach((g, i) => {
        const correct = gameState.graphemes[i].rawString == g.rawString;
        correctList.push(correct);
        gameState.allCorrect &&= correct;
      });

      gameState.correctList = correctList;

      gameState = { ...gameState };

      if (!gameState.allCorrect) {
        // incorrect
        gameState.streak = false;
        return gameState;
      }

      // correct
      gameState.totalUnscrambled++;

      gameState.score += gameState.streak ? 2 : 1;
      gameState.streak = true;

      return gameState;
    });
  };

  return (
    <RouteRoot>
      <SubMenuTopNav>
        <SubMenuBackButton />
      </SubMenuTopNav>

      <GameTitle>{t("Unscramble")}</GameTitle>

      {params.mode != "endless" && (
        <ScoreRow>
          <GameClock seconds={gameState.maxTime - seconds} />
          <Score score={gameState.score} />
        </ScoreRow>
      )}

      <Animated.View style={[styles.definitionBlock, opacityStyle]}>
        <View
          style={[
            styles.definitionBubble,
            theme.styles.definitionBorders,
            theme.styles.definitionBackground,
          ]}
        >
          <Span style={styles.definition}>
            {
              definitionMap[gameState.activeWords[0]]?.definitionsResult
                ?.definitions[gameState.activeWord?.orderKey ?? 0]?.definition
            }
          </Span>
        </View>
      </Animated.View>

      <Animated.View style={[styles.chipsBlock, opacityStyle]}>
        {!gameState.roundStarted &&
          gameState.graphemes.map((grapheme, i) => (
            <ChipSlot
              index={i}
              key={grapheme.rawIndex}
              puzzleColors={puzzleColors}
              gameState={gameState}
              setGameState={setGameState}
              getGameState={getGameState}
              opacity={opacity}
            >
              {grapheme.rawString}
            </ChipSlot>
          ))}
      </Animated.View>

      <View style={styles.buttonsBlock}>
        <CircleButton
          style={[styles.button, theme.styles.definitionBackground]}
          android_ripple={theme.ripples.transparentButton}
          onPress={() => {
            setGameState({
              ...gameState,
              graphemeSelected: undefined,
              graphemes: cloneAndShuffle(gameState.graphemes),
            });
          }}
        >
          <ShuffleIcon size={48} color={theme.colors.iconButton} />
        </CircleButton>

        <CircleButton
          style={styles.button}
          android_ripple={theme.ripples.transparentButton}
          onPress={checkSelection}
        >
          <ArrowRightIcon size={48} color={theme.colors.primary.contrast} />
        </CircleButton>
      </View>

      <ResultsDialog
        open={gameState.displayingResults}
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
            score={dictionary.stats.unscrambleBest?.[gameState.mode] ?? 0}
          />
        </ResultsRow>
      </ResultsDialog>
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  definitionBlock: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 16,
  },
  definitionBubble: {
    marginVertical: 8,
    marginHorizontal: "auto",
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  definition: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  chipsBlock: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    gap: 2,
    marginHorizontal: "auto",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  slot: {
    borderRadius: 5,
    height: 48,
    width: 36,
  },
  chip: {
    borderRadius: 5,
    height: 48,
    width: 36,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 24,
  },
  buttonsBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 16,
  },
  button: {
    padding: 8,
  },
});
