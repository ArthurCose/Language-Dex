import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { Signal, useSignalLens } from "@/lib/hooks/use-signal";
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
} from "@/lib/practice/random";
import { fadeTo, flash } from "@/lib/practice/animations";
import { Timer, useTimerSeconds } from "@/lib/practice/timer";
import useGettableState from "@/lib/hooks/use-gettable-state";
import { Grapheme } from "@akahuku/unistring";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import {
  GameClock,
  GameTitle,
  Score,
  ScoreRow,
} from "@/lib/components/practice/info";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";
import CircleButton from "@/lib/components/circle-button";
import {
  ArrowRightIcon,
  PracticeResultsIcon,
  ShuffleIcon,
} from "@/lib/components/icons";
import Animated, {
  useSharedValue,
  runOnJS,
  withSpring,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureStateChangeEvent,
  PanGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import usePracticeColors, {
  PracticeColors,
} from "@/lib/hooks/use-practice-colors";
import {
  ResultsClock,
  ResultsDialog,
  ResultsLabel,
  ResultsRow,
  ResultsScore,
  ResultsSpacer,
} from "@/lib/components/practice/results";
import RouteRoot from "@/lib/components/route-root";
import { SubMenuIconButton } from "@/lib/components/icon-button";
import { PracticeAd } from "@/lib/components/ads";
import {
  joinGraphemes,
  toGraphemes,
  toGraphemeStrings,
} from "@/lib/practice/words";
import useAnimationEffects from "@/lib/hooks/use-animation-effects";
import { DefinitionBubble } from "@/lib/components/practice/definition-bubbles";

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

  gameState.graphemes = toGraphemes(gameState.activeWord.spelling);

  while (joinGraphemes(gameState.graphemes) == gameState.activeWord.spelling) {
    shuffle(gameState.graphemes);
  }

  if (gameState.mode == "rush") {
    gameState.timer.reset();
  } else if (gameState.mode == "endless") {
    gameState.bagLen = gameState.bagWords.length;
  }

  gameState.roundStarted = true;
}

function updateGameStats(
  userDataSignal: Signal<UserData>,
  gameState: GameState
) {
  userDataSignal.set(
    updateStatistics(userDataSignal.get(), (stats) => {
      stats.unscrambled = (stats.unscrambled ?? 0) + gameState.totalUnscrambled;

      if (!stats.unscrambleBest) {
        stats.unscrambleBest = {};
      }

      stats.unscrambleBest[gameState.mode] = Math.max(
        stats.unscrambleBest[gameState.mode] ?? 0,
        gameState.score
      );
    })
  );
}

function overlappingGraphemeIndex(gameState: GameState, x: number, y: number) {
  for (let i = 0; i < gameState.graphemes.length; i++) {
    const p = gameState.graphemeBoxes[i];

    if (!p) {
      continue;
    }

    // extra height
    const eh = p.h;

    if (x >= p.x && x <= p.x + p.w && y >= p.y - eh && y <= p.y + p.h + eh) {
      return i;
    }
  }
}

type ChipSlotProps = {
  word: GameWord;
  index: number;
  practiceColors: PracticeColors;
  selected: boolean;
  correctList?: boolean[];
  setGameState: (gameState: GameState) => void;
  getGameState: () => GameState;
} & React.PropsWithChildren;

const springConfig = {
  mass: 0.2,
  damping: 22,
};

const ChipSlot = React.memo(function ({
  word,
  index,
  practiceColors,
  selected,
  correctList,
  setGameState,
  getGameState,
  children,
}: ChipSlotProps) {
  const theme = useTheme();
  const originalPos = useSharedValue<
    | {
        x: number;
        y: number;
      }
    | undefined
  >(undefined);
  const interacting = useSharedValue(false);
  const position = useSharedValue({ x: 0, y: 0 });
  const color = useSharedValue(theme.colors.text);
  const backgroundColor = useSharedValue(theme.colors.definitionBackground);
  const borderColor = useSharedValue(theme.colors.borders);

  const animatedStyle = useAnimatedStyle(() => {
    const { x: left, y: top } = position.value;
    let moving = false;

    if (originalPos.value) {
      moving = left != originalPos.value.x || top != originalPos.value.y;
    }

    return {
      position: "absolute",
      left,
      top,
      zIndex: moving || interacting.value ? 1 : 0,
      borderColor: selected ? theme.colors.primary.default : borderColor.value,
      backgroundColor: backgroundColor.value,
    };
  }, [selected]);

  const animatedTextStyle = {
    color,
  };

  // animations that need to run after updating style outputRanges
  const pushAnimation = useAnimationEffects();

  // highlight on correctness check
  useEffect(() => {
    if (!correctList) {
      return;
    }

    let targetColor;
    let targetBackgroundColor;
    let targetBorderColor;

    if (correctList[index]) {
      // correct colors
      targetColor = practiceColors.correct.color;
      targetBackgroundColor = practiceColors.correct.backgroundColor;
      targetBorderColor = practiceColors.correct.borderColor;
    } else {
      // incorrect colors
      targetColor = practiceColors.mistake.color;
      targetBackgroundColor = practiceColors.mistake.backgroundColor;
      targetBorderColor = practiceColors.mistake.borderColor;
    }

    pushAnimation(() => {
      flash(color, targetColor, theme.colors.text);
      flash(
        backgroundColor,
        targetBackgroundColor,
        theme.colors.definitionBackground
      );
      flash(borderColor, targetBorderColor, theme.colors.borders);
    });
  }, [correctList]);

  // reset original position
  useLayoutEffect(() => {
    originalPos.value = undefined;
  }, [word]);

  const gesture = useMemo(() => {
    const begin = () => {
      const gameState = getGameState();

      if (gameState.graphemeInteraction) {
        return;
      }

      interacting.value = true;
      setGameState({ ...gameState, graphemeInteraction: true });
    };

    const start = () => {
      if (interacting.value) {
        setGameState({ ...getGameState(), graphemeSelected: undefined });
      }
    };

    const update = (x: number, y: number) => {
      "worklet";

      if (interacting.value && originalPos.value) {
        position.value = {
          x: x + originalPos.value.x,
          y: y + originalPos.value.y,
        };
      }
    };

    const finalize = (
      e: GestureStateChangeEvent<PanGestureHandlerEventPayload>,
      dragged: boolean
    ) => {
      if (!interacting.value) {
        return;
      }

      const gameState = { ...getGameState(), graphemeInteraction: false };
      let swapped = false;

      if (dragged) {
        const i = overlappingGraphemeIndex(gameState, e.absoluteX, e.absoluteY);

        if (i != undefined && i != index) {
          gameState.graphemes = [...gameState.graphemes];
          swap(gameState.graphemes, index, i);
          swapped = true;
        }
      } else if (gameState.graphemeSelected != undefined) {
        gameState.graphemes = [...gameState.graphemes];
        swap(gameState.graphemes, index, gameState.graphemeSelected);
        swapped = true;
        gameState.graphemeSelected = undefined;
      } else {
        gameState.graphemeSelected = index;
      }

      if (!swapped && originalPos.value) {
        position.value = withSpring(originalPos.value, springConfig);
      }

      interacting.value = false;
      setGameState(gameState);
    };

    return Gesture.Pan()
      .onBegin(() => runOnJS(begin)())
      .onStart(() => runOnJS(start)())
      .onUpdate((e) => update(e.translationX, e.translationY))
      .onFinalize((e, success) => runOnJS(finalize)(e, success));
  }, [index]);

  return (
    <>
      <View
        style={[styles.slot, { backgroundColor: theme.colors.borders }]}
        onLayout={(e) => {
          const { x, y } = e.nativeEvent.layout;

          const pos = { x, y };

          if (originalPos.value == undefined) {
            position.value = pos;
          } else {
            position.value = withSpring(pos, springConfig);
          }

          originalPos.value = pos;

          e.target.measure((_x, _y, w, h, pageX, pageY) => {
            // not using setGameState, since we're modifying directly
            getGameState().graphemeBoxes[index] = {
              x: pageX,
              y: pageY,
              w,
              h,
            };
          });
        }}
      />

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.chip, animatedStyle]}>
          <Animated.Text
            style={[styles.chipText, theme.styles.text, animatedTextStyle]}
          >
            {children}
          </Animated.Text>
        </Animated.View>
      </GestureDetector>
    </>
  );
});

export default function () {
  const params = useLocalSearchParams<{ mode: string }>();
  const theme = useTheme();
  const practiceColors = usePracticeColors();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary
  );
  const dictionaryStats = useSignalLens(
    userDataSignal,
    (data) =>
      data.dictionaries.find((d) => d.id == data.activeDictionary)!.stats
  );

  const [resolvedAdSize, setResolvedAdSize] = useState(false);
  const onAdResize = useCallback(() => setResolvedAdSize(true), []);

  const [allWords, setAllWords] = useState<GameWord[] | null>(null);
  const [gameState, setGameState, getGameState] = useGettableState(() =>
    initGameState([], params.mode as UnscrambleGameMode)
  );

  const definitionMap = useWordDefinitions(
    activeDictionary,
    gameState.activeWords
  );

  const pushAnimation = useAnimationEffects();
  const seconds = useTimerSeconds(gameState.timer);

  useEffect(() => {
    listGameWords(activeDictionary, { minLength: 2 })
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
  const opacityStyle = {
    opacity,
  };

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

      pushAnimation(() => fadeTo(opacity, 1, endCallback));
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
    updateGameStats(userDataSignal, gameState);
  }, [gameOver]);

  useEffect(() => {
    return () => {
      const gameState = getGameState();

      if (!gameState.over) {
        // add unsaved stats
        updateGameStats(userDataSignal, gameState);
      }
    };
  }, []);

  const checkSelection = () => {
    if (gameState.allCorrect) {
      return;
    }

    setGameState((gameState) => {
      if (!gameState.activeWord) {
        return gameState;
      }

      gameState.correctList = toGraphemeStrings(
        gameState.activeWord.spelling
      ).map((g, i) => gameState.graphemes[i].rawString == g);

      gameState.allCorrect = gameState.correctList.every((b) => b);

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

        <SubMenuActions>
          {gameState.over && (
            <SubMenuIconButton
              icon={PracticeResultsIcon}
              onPress={() =>
                setGameState({ ...gameState, displayingResults: true })
              }
            />
          )}
        </SubMenuActions>
      </SubMenuTopNav>

      <GameTitle>{t("Unscramble")}</GameTitle>

      {params.mode != "endless" && (
        <ScoreRow>
          <GameClock seconds={gameState.maxTime - seconds} />
          <Score score={gameState.score} />
        </ScoreRow>
      )}

      <PracticeAd onSizeChange={onAdResize} />

      {resolvedAdSize && !gameState.loading && (
        <>
          <Animated.View style={[styles.definitionBlock, opacityStyle]}>
            <DefinitionBubble>
              {
                definitionMap[gameState.activeWords[0]]?.definitionsResult
                  ?.definitions[gameState.activeWord?.orderKey ?? 0]?.definition
              }
            </DefinitionBubble>
          </Animated.View>

          <Animated.View style={[styles.chipsBlock, opacityStyle]}>
            {!gameState.roundStarted &&
              gameState.graphemes.map((grapheme, i) => (
                <ChipSlot
                  word={gameState.activeWord!}
                  index={i}
                  key={grapheme.rawIndex}
                  practiceColors={practiceColors}
                  selected={gameState.graphemeSelected == i}
                  correctList={gameState.correctList}
                  setGameState={setGameState}
                  getGameState={getGameState}
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
              disabled={gameOver}
              onPress={checkSelection}
            >
              <ArrowRightIcon size={48} color={theme.colors.primary.contrast} />
            </CircleButton>
          </View>
        </>
      )}

      <ResultsDialog
        open={gameState.displayingResults}
        onClose={() => setGameState({ ...gameState, displayingResults: false })}
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
          <ResultsLabel>{t("Total_Time")}</ResultsLabel>
          <ResultsClock
            maxSeconds={gameState.maxTime}
            seconds={gameState.totalTimer.seconds()}
          />
        </ResultsRow>

        <ResultsRow>
          <ResultsLabel>{t("Score")}</ResultsLabel>
          <ResultsScore score={gameState.score} />
        </ResultsRow>

        <ResultsSpacer />

        <ResultsRow>
          <ResultsLabel>{t("Top_Score")}</ResultsLabel>
          <ResultsScore
            score={dictionaryStats.unscrambleBest?.[gameState.mode] ?? 0}
          />
        </ResultsRow>
      </ResultsDialog>
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  definitionBlock: {
    flex: 1,
    justifyContent: "flex-end",
    marginHorizontal: 16,
  },
  chipsBlock: {
    flex: 1,
    display: "flex",
    marginHorizontal: "auto",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 2,
    justifyContent: "center",
    alignContent: "center",
    zIndex: 1,
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
    alignItems: "flex-start",
    justifyContent: "center",
    flexDirection: "row",
    gap: 16,
  },
  button: {
    padding: 8,
  },
});
