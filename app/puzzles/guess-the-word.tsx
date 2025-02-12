import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { isValidWord, listWords, updateStatistics } from "@/lib/data";
import Unistring, { Grapheme } from "@akahuku/unistring";
import { pickIndexBiased } from "@/lib/puzzles/random";
import { Timer } from "@/lib/puzzles/timer";
import useGettableState from "@/lib/hooks/use-gettable-state";
import SubMenuTopNav, {
  SubMenuActions,
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
import { useTheme } from "@/lib/contexts/theme";
import useKeyboardVisible from "@/lib/hooks/use-keyboard-visible";
import { Theme } from "@/lib/themes";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  IncorrectIcon,
  PuzzleResultsIcon,
} from "@/lib/components/icons";
import RouteRoot from "@/lib/components/route-root";
import {
  DockedTextInput,
  DockedTextInputContainer,
  DockedTextInputSubmitButton,
} from "@/lib/components/puzzles/docked-text-input";
import { SubMenuIconButton } from "@/lib/components/icon-button";

type Guess = { graphemes: Grapheme[]; pending: boolean; valid: boolean };

type GameState = {
  over: boolean;
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
    over: false,
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
      backgroundColor = incorrectPositionBackground;
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
  const submitLocked =
    pendingGuessLocked || pendingGuess.length == 0 || gameState.over;
  const scrollViewRef = useRef<ScrollView>(null);

  const keyboardVisible = useKeyboardVisible();

  useEffect(() => {
    listWords(userData.activeDictionary, {
      ascending: true,
      orderBy: "confidence",
      minLength: 1,
      belowMaxConfidence: true,
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

    const lowerCaseGuess = pendingGuess.trimEnd().toLowerCase();

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
          setGameState({ ...gameState, over: true, displayingResults: true });
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

      <GameTitle>{t("Guess_the_Word")}</GameTitle>

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

      <DockedTextInputContainer
        style={!keyboardVisible && styles.inputControlsKeyboardHidden}
      >
        <DockedTextInput
          placeholder={t("Enter_Guess")}
          onChangeText={setPendingGuess}
          submitBehavior="submit"
          onSubmitEditing={submit}
          value={pendingGuess}
        />
        <DockedTextInputSubmitButton disabled={submitLocked} onPress={submit} />
      </DockedTextInputContainer>

      <ResultsDialog
        open={gameState.displayingResults}
        onClose={() => setGameState({ ...gameState, displayingResults: false })}
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
      </ResultsDialog>
    </RouteRoot>
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
  inputControlsKeyboardHidden: {
    marginBottom: 12,
  },
});

const incorrectBackground = "#555";
const correctBackground = "#1aba1f";
const incorrectPositionBackground = "#eeaa1f";
