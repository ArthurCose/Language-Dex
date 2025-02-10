import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { isValidWord, listWords, updateStatistics } from "@/lib/data";
import Unistring, { Grapheme } from "@akahuku/unistring";
import { pickIndexBiased, Timer, useGettableState } from "@/lib/puzzles";
import SubMenuTopNav, {
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import { GameTitle } from "@/lib/components/puzzles/info";
import { useTranslation } from "react-i18next";
import {
  ResultsClock,
  ResultsDialog,
  ResultsLabel,
  ResultsRow,
  ResultsScore,
  ResultsSpacer,
} from "@/lib/components/puzzles/results";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { logError } from "@/lib/log";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import CustomTextInput from "@/lib/components/custom-text-input";
import { useTheme } from "@/lib/contexts/theme";
import useKeyboardVisible from "@/lib/hooks/use-keyboard-visible";
import { Theme } from "@/lib/themes";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ConfirmReadyIcon,
  IncorrectIcon,
} from "@/lib/components/icons";

type Guess = { graphemes: Grapheme[]; pending: boolean; valid: boolean };

type GameState = {
  displayingResults: boolean;
  activeWord?: string;
  guesses: Guess[];
  graphemes: Grapheme[];
  correctList?: boolean[];
  roundStarted: boolean;
  totalTimer: Timer;
};

function initGameState() {
  const gameState: GameState = {
    displayingResults: false,
    guesses: [],
    graphemes: [],
    roundStarted: true,
    totalTimer: new Timer(),
  };

  return gameState;
}

function toGraphemes(word: string) {
  const graphemes: Grapheme[] = [];

  Unistring(word).forEach((grapheme) => {
    graphemes.push(grapheme);
  });

  return graphemes;
}

function startGame(gameState: GameState, words: string[]) {
  const wordIndex = pickIndexBiased(words);
  gameState.activeWord = words[wordIndex];

  gameState.graphemes = toGraphemes(gameState.activeWord.toLowerCase());
  gameState.correctList = undefined;
}

type GuessCharacterProps = {
  theme: Theme;
  guess: Guess;
  index: number;
  correctGraphemes: Grapheme[];
};

const guessCharAnimationInitialDelay = 150;
const guessCharAnimationDelay = 200;
const guessCharAnimationDuration = guessCharAnimationDelay * 1.5;

function GuessCharacter({
  theme,
  guess,
  index,
  correctGraphemes,
}: GuessCharacterProps) {
  const sharedStyleValues = useSharedValue({
    color: theme.colors.text,
    backgroundColor: "transparent",
  });

  const animatedStyle = useAnimatedStyle(() => sharedStyleValues.value);

  const grapheme = guess.graphemes[index];

  useEffect(() => {
    if (guess.pending) {
      return;
    }

    if (!guess.valid) {
      sharedStyleValues.value = withTiming(
        {
          color: theme.colors.disabledText,
          backgroundColor: "transparent",
        },
        { duration: guessCharAnimationDuration }
      );
      return;
    }

    // resolve background color
    let backgroundColor = incorrectBackground;
    const correctGrapheme = correctGraphemes[index];

    if (correctGrapheme?.rawString == grapheme.rawString) {
      backgroundColor = correctBackground;
    } else if (
      correctGraphemes.some((g) => grapheme.rawString == g.rawString)
    ) {
      backgroundColor = incorrectPositoinBackground;
    }

    // animate
    sharedStyleValues.value = withDelay(
      guessCharAnimationDelay * index + guessCharAnimationInitialDelay,
      withTiming(
        { color: "white", backgroundColor },
        { duration: guessCharAnimationDuration }
      )
    );
  }, [guess.pending]);

  return (
    <Animated.Text
      key={grapheme.rawIndex}
      style={[styles.guessCharacter, theme.styles.borders, animatedStyle]}
    >
      {grapheme.rawString}
    </Animated.Text>
  );
}

type GuessTailProps = {
  theme: Theme;
  guess: Guess;
  correctGraphemes: Grapheme[];
};

function GuessTail({ theme, guess, correctGraphemes }: GuessTailProps) {
  const initialColor = "transparent";
  const [color, setColor] = useState(initialColor);

  useEffect(() => {
    if (guess.pending) {
      return;
    }

    const delay = guess.valid
      ? guessCharAnimationDelay * guess.graphemes.length +
        guessCharAnimationInitialDelay
      : 0;

    setTimeout(() => {
      const start = performance.now();
      const inputRange = [0, guessCharAnimationDuration];
      const outputRange = [initialColor, theme.colors.disabledText];

      const animate = () => {
        const time = performance.now() - start;
        setColor(interpolateColor(time, inputRange, outputRange));

        if (time >= guessCharAnimationDuration) {
          return;
        }

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }, delay);
  }, [guess.pending]);

  if (guess.pending) {
    return;
  }

  if (!guess.valid) {
    return <IncorrectIcon size={32} color={color} />;
  } else if (correctGraphemes.length > guess.graphemes.length) {
    return <ArrowRightIcon size={32} color={color} />;
  } else if (correctGraphemes.length < guess.graphemes.length) {
    return <ArrowLeftIcon size={32} color={color} />;
  }
}

type GuessRowProps = {
  theme: Theme;
  guess: Guess;
  correctGraphemes: Grapheme[];
};

const GuessRow = React.memo(function ({
  theme,
  guess,
  correctGraphemes,
}: GuessRowProps) {
  return (
    <ScrollView contentContainerStyle={styles.guess} horizontal>
      {guess.graphemes.map((_, i) => (
        <GuessCharacter
          key={i}
          theme={theme}
          guess={guess}
          index={i}
          correctGraphemes={correctGraphemes}
        />
      ))}

      <GuessTail
        theme={theme}
        guess={guess}
        correctGraphemes={correctGraphemes}
      />
    </ScrollView>
  );
});

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const [userData, setUserData] = useUserDataContext();
  const [allWords, setAllWords] = useState<string[] | null>(null);
  const [gameState, setGameState, getGameState] = useGettableState(() =>
    initGameState()
  );
  const [pendingGuess, setPendingGuess] = useState("");
  const [pendingGuessLocked, setPendingGuessLocked] = useState(false);
  const submitLocked = pendingGuessLocked || pendingGuess.length == 0;
  const scrollViewRef = useRef<ScrollView>(null);

  const keyboardVisible = useKeyboardVisible();

  useEffect(() => {
    listWords(userData.activeDictionary, {
      ascending: true,
      orderBy: "confidence",
      minLength: 1,
    })
      .then((words) => {
        setAllWords(words);

        const updatedGameState = { ...gameState };
        startGame(updatedGameState, words);
        setGameState(updatedGameState);
      })
      .catch(logError);
  }, []);

  if (!allWords) {
    return;
  }

  const submit = () => {
    if (submitLocked) {
      return;
    }

    gameState.totalTimer.resume();

    setPendingGuess("");
    setPendingGuessLocked(true);

    const lowerCaseGuess = pendingGuess.toLowerCase();

    const guesses = [
      ...gameState.guesses,
      {
        graphemes: toGraphemes(lowerCaseGuess),
        pending: true,
        valid: false,
      },
    ];

    setGameState({ ...gameState, guesses });

    isValidWord(userData.activeDictionary, lowerCaseGuess)
      .then((valid) => {
        const gameState = getGameState();
        const guesses = [...gameState.guesses];
        const latestGuess = {
          ...guesses[guesses.length - 1],
          pending: false,
          valid,
        };

        guesses[guesses.length - 1] = latestGuess;

        setGameState({ ...gameState, guesses });

        // see if we got it correct:

        if (latestGuess.graphemes.length != gameState.graphemes.length) {
          setPendingGuessLocked(false);
          return;
        }

        const allMatch = latestGuess.graphemes.every(
          (g, i) => gameState.graphemes[i].rawString == g.rawString
        );

        if (!allMatch) {
          setPendingGuessLocked(false);
          return;
        }

        // stop the timer
        gameState.totalTimer.pause();

        // set up displaying the results
        const delay =
          guessCharAnimationDelay * (gameState.graphemes.length + 2) +
          guessCharAnimationInitialDelay;

        setTimeout(() => {
          const gameState = getGameState();
          setGameState({ ...gameState, displayingResults: true });
        }, delay);

        setUserData((userData) => {
          return updateStatistics(userData, (stats) => {
            stats.wordsGuessed = (stats.wordsGuessed ?? 0) + 1;
          });
        });
      })
      .catch(logError);
  };

  return (
    <>
      <SubMenuTopNav>
        <SubMenuBackButton />
      </SubMenuTopNav>

      <GameTitle>{t("Guess")}</GameTitle>

      <ScrollView
        ref={scrollViewRef}
        style={styles.guessesView}
        contentContainerStyle={styles.guesses}
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd();
        }}
      >
        {gameState.guesses.map((guess, i) => (
          <GuessRow
            key={i}
            theme={theme}
            guess={guess}
            correctGraphemes={gameState.graphemes}
          />
        ))}
      </ScrollView>

      <View
        style={[
          styles.inputControls,
          keyboardVisible && styles.inputControlsKeyboardVisible,
        ]}
      >
        <CustomTextInput
          style={[theme.styles.definitionBackground, styles.textInput]}
          placeholder={t("Guess_Here")}
          onChangeText={setPendingGuess}
          submitBehavior="submit"
          onSubmitEditing={submit}
          value={pendingGuess}
        />

        <Pressable
          style={[
            submitLocked
              ? theme.styles.circleButtonDisabled
              : theme.styles.circleButton,
            styles.submitButton,
          ]}
          disabled={submitLocked}
          onPress={submit}
          android_ripple={theme.ripples.primaryButton}
        >
          <ConfirmReadyIcon color={theme.colors.primary.contrast} size={30} />
        </Pressable>
      </View>

      <ResultsDialog
        open={gameState.displayingResults}
        onReplay={() => {
          const newState = initGameState();
          startGame(newState, allWords);
          setGameState(newState);
          setPendingGuessLocked(false);
        }}
      >
        <ResultsRow>
          <ResultsLabel>{t("Total_Time")}</ResultsLabel>
          <ResultsClock seconds={gameState.totalTimer.seconds()} />
        </ResultsRow>

        <ResultsRow>
          <ResultsLabel>{t("Guesses")}</ResultsLabel>
          <ResultsScore score={gameState.guesses.length} />
        </ResultsRow>

        <ResultsSpacer />
      </ResultsDialog>
    </>
  );
}

const styles = StyleSheet.create({
  guessesView: {
    flex: 1,
    marginTop: 12,
  },
  guesses: {
    gap: 4,
    padding: 8,
  },
  guess: {
    display: "flex",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  guessCharacter: {
    fontSize: 20,
    width: 32,
    paddingVertical: 4,
    textAlign: "center",
    borderWidth: 2,
  },
  flex: {
    flex: 1,
  },
  inputControls: {
    flexDirection: "row",
    marginBottom: 12,
    height: 48,
  },
  inputControlsKeyboardVisible: {
    flexDirection: "row",
    marginBottom: 0,
  },
  textInput: {
    fontSize: 20,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    flex: 1,
  },
  submitButton: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});

const incorrectBackground = "#555";
const correctBackground = "#1aba1f";
const incorrectPositoinBackground = "#ddaa1f";
