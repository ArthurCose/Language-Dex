import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { GameWord, listGameWords } from "@/lib/data";
import { logError } from "@/lib/log";
import { pickIndexWithLenBiased, swapToEnd } from "@/lib/practice/random";
import { fadeTo } from "@/lib/practice/animations";
import useGettableState from "@/lib/hooks/use-gettable-state";
import SubMenuTopNav, {
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import {
  CorrectScore,
  GameTitle,
  IncorrectScore,
  ScoreRow,
} from "@/lib/components/practice/info";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";
import { Span } from "@/lib/components/text";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import usePracticeColors from "@/lib/hooks/use-practice-colors";
import RouteRoot from "@/lib/components/route-root";
import { PracticeAd } from "@/lib/components/ads";
import useAnimationEffects from "@/lib/hooks/use-animation-effects";
import {
  DockedTextInput,
  DockedTextInputContainer,
  DockedTextInputSubmitButton,
} from "@/lib/components/practice/docked-text-input";
import useKeyboardVisible from "@/lib/hooks/use-keyboard-visible";
import { DefinitionBubble } from "@/lib/components/practice/definition-bubbles";

type GameState = {
  loading: boolean;
  bagWords: GameWord[];
  bagLen: number;
  activeWord?: GameWord;
  activeWords: string[];
  incorrectCount: number;
  correctCount: number;
  roundStarted: boolean;
};

function initGameState(words: GameWord[]) {
  const gameState: GameState = {
    loading: true,
    bagWords: words,
    bagLen: words.length,
    activeWords: [],
    incorrectCount: 0,
    correctCount: 0,
    roundStarted: false,
  };

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

  if (gameState.bagLen == 0) {
    gameState.bagLen = gameState.bagWords.length;
  }

  if (!gameState.activeWord) {
    gameState.activeWords = [];
    return;
  }

  gameState.activeWords = [gameState.activeWord.spelling.toLowerCase()];

  gameState.roundStarted = true;
}

export default function () {
  const theme = useTheme();
  const practiceColors = usePracticeColors();
  const [t] = useTranslation();
  const [userData, setUserData] = useUserDataContext();
  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
  )!;

  const [resolvedAdSize, setResolvedAdSize] = useState(false);
  const onAdResize = useCallback(() => setResolvedAdSize(true), []);

  const [allWords, setAllWords] = useState<GameWord[] | null>(null);
  const [gameState, setGameState, getGameState] = useGettableState(() =>
    initGameState([])
  );

  const definitionMap = useWordDefinitions(
    userData.activeDictionary,
    gameState.activeWords
  );

  const [pendingGuess, setPendingGuess] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const keyboardVisible = useKeyboardVisible();
  const pushAnimation = useAnimationEffects();

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
  const opacityStyle = {
    opacity,
  };

  // fade in to start the round
  useEffect(() => {
    if (gameState.roundStarted) {
      setGameState((gameState) => ({ ...gameState, roundStarted: false }));
      pushAnimation(() => fadeTo(opacity, 1));
      setSubmitted(false);
    }
  }, [gameState.roundStarted]);

  const truthOpacity = useSharedValue(0);
  const truthStyle = {
    opacity: truthOpacity,
  };

  const mysteryStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    opacity: 1 - truthOpacity.value,
  }));

  const [submissionStyle, setSubmissionColor] = useState<
    TextStyle | undefined
  >();

  const submit = () => {
    setSubmitted(true);

    const correct = pendingGuess.toLowerCase() == gameState.activeWords[0];

    if (correct) {
      setSubmissionColor({ color: practiceColors.correct.color });
    } else {
      setSubmissionColor({ color: practiceColors.mistake.color });
    }

    // update score
    setGameState((gameState) => {
      gameState = { ...gameState };

      if (correct) {
        gameState.correctCount += 1;
      } else {
        gameState.incorrectCount += 1;
      }

      return gameState;
    });

    const fadeToNextRound = () => {
      // transition to start next round
      const middleCallback = () => {
        // setup next round while the board isn't visible
        setGameState((gameState) => {
          gameState = { ...gameState };
          setUpNextRound(gameState);

          setPendingGuess("");
          setSubmissionColor(undefined);
          pushAnimation(() => {
            fadeTo(opacity, 1);
            truthOpacity.value = 0;
          });
          return gameState;
        });
      };

      // start transition
      setTimeout(() => fadeTo(opacity, 0, middleCallback), 1000);
    };

    fadeTo(truthOpacity, 1, fadeToNextRound);
  };

  return (
    <RouteRoot>
      <SubMenuTopNav>
        <SubMenuBackButton />
      </SubMenuTopNav>

      <GameTitle>{t("Short_Answer")}</GameTitle>

      <ScoreRow>
        <IncorrectScore score={gameState.incorrectCount} />
        <CorrectScore score={gameState.correctCount} />
      </ScoreRow>

      <PracticeAd onSizeChange={onAdResize} />

      {resolvedAdSize && !gameState.loading && (
        <>
          <Animated.View style={[styles.definitionAndWordBlock, opacityStyle]}>
            <View style={styles.definitionBlock}>
              <DefinitionBubble>
                {
                  definitionMap[gameState.activeWords[0]]?.definitionsResult
                    ?.definitions[gameState.activeWord?.orderKey ?? 0]
                    ?.definition
                }
              </DefinitionBubble>
            </View>

            <View style={styles.wordBlock}>
              <Animated.View style={mysteryStyle}>
                <Span style={styles.wordStyle}>
                  {t("short_answer_mystery")}
                </Span>
              </Animated.View>

              <Animated.View style={truthStyle}>
                <Span style={styles.wordStyle}>
                  {gameState.activeWord?.spelling}
                </Span>
              </Animated.View>
            </View>
          </Animated.View>

          <DockedTextInputContainer
            style={!keyboardVisible && styles.inputControlsKeyboardHidden}
          >
            <DockedTextInput
              style={submissionStyle}
              placeholder={t("Enter_Guess")}
              onChangeText={setPendingGuess}
              submitBehavior="submit"
              onSubmitEditing={submit}
              value={pendingGuess}
            />
            <DockedTextInputSubmitButton
              disabled={submitted || !gameState.activeWord}
              onPress={submit}
            />
          </DockedTextInputContainer>
        </>
      )}
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  definitionAndWordBlock: {
    flex: 1,
    justifyContent: "space-evenly",
  },
  definitionBlock: {
    justifyContent: "center",
    marginHorizontal: 16,
  },
  wordBlock: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  wordStyle: {
    fontSize: 24,
  },
  inputControlsKeyboardHidden: {
    marginBottom: 12,
  },
});
