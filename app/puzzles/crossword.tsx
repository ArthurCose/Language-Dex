import { useEffect, useState } from "react";
import {
  Text,
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  Keyboard,
} from "react-native";
import { Timer } from "@/lib/puzzles/timer";
import useGettableState from "@/lib/hooks/use-gettable-state";
import { getWordDefinitions, listWords, updateStatistics } from "@/lib/data";
import { logError } from "@/lib/log";
import { useTranslation } from "react-i18next";
import { useUserDataContext } from "@/lib/contexts/user-data";
import RouteRoot from "@/lib/components/route-root";
import {
  DockedTextInput,
  DockedTextInputContainer,
  DockedTextInputHintButton,
  DockedTextInputSubmitButton,
} from "@/lib/components/puzzles/docked-text-input";
import {
  ResultsClock,
  ResultsDialog,
  ResultsHintScore,
  ResultsIncorrectScore,
  ResultsLabel,
  ResultsRow,
} from "@/lib/components/puzzles/results";
import { useTheme } from "@/lib/contexts/theme";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import { SubMenuIconButton } from "@/lib/components/icon-button";
import { ConfirmReadyIcon, PuzzleResultsIcon } from "@/lib/components/icons";
import {
  GameTitle,
  HintScore,
  IncorrectScore,
  ScoreRow,
} from "@/lib/components/puzzles/info";
import {
  Crossword,
  generateCrossword,
} from "@/lib/puzzles/crossword-generation";
import { splitByGrapheme } from "@/lib/puzzles/words";
import CircleButton from "@/lib/components/circle-button";
import useKeyboardVisible from "@/lib/hooks/use-keyboard-visible";
import { pickIndexWithLenUnbiased } from "@/lib/puzzles/random";
import Dialog from "@/lib/components/dialog";
import { Span } from "@/lib/components/text";

type GameState = {
  over: boolean;
  displayingResults: boolean;
  board: Crossword;
  hintsRemaining: number;
  incorrectSubmissions: number;
  totalTimer: Timer;
};

function initGameState() {
  const gameState: GameState = {
    over: false,
    displayingResults: false,
    board: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      density: 0,
      cells: [],
      cellMap: {},
      words: [],
    },
    hintsRemaining: 0,
    incorrectSubmissions: 0,
    totalTimer: new Timer(),
  };

  return gameState;
}

function startGame(gameState: GameState, words: string[]) {
  gameState.board = generateCrossword(words);
  gameState.hintsRemaining = gameState.board.words.length;
  gameState.totalTimer.resume();
}

function updateWordSubmission(
  gameState: GameState,
  wordIndex: number,
  text: string
) {
  const board = { ...gameState.board };
  const selectedWord = board.words[wordIndex];

  const submittedGraphemes = splitByGrapheme(text.toLowerCase());

  // iterate over cells to update submissions even on crossing words
  for (let i = 0; i < selectedWord.cells.length; i++) {
    const cellKey = selectedWord.cells[i];
    const cell = board.cellMap[cellKey];

    if (cell.locked) {
      continue;
    }

    const submittedGrapheme = submittedGraphemes[i] as string | undefined;

    // update the text submitted to this cell
    cell.submitted = submittedGrapheme;
  }
}

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const [userData, setUserData] = useUserDataContext();
  const [allWords, setAllWords] = useState<string[] | null>(null);
  const [gameState, setGameState, getGameState] = useGettableState(() =>
    initGameState()
  );
  const [wordGuess, setWordGuess] = useState("");
  const [wordGuessIndex, setWordGuessIndex] = useState<number | null>(null);
  const [hintDialogOpen, setHintDialogOpen] = useState(false);

  const selectedWord =
    wordGuessIndex != null ? gameState.board.words[wordGuessIndex] : null;

  useEffect(() => {
    listWords(userData.activeDictionary, {
      ascending: true,
      orderBy: "confidence",
      minLength: 2,
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

  useEffect(() => {
    const listener = Keyboard.addListener("keyboardDidHide", () => {
      setWordGuessIndex(null);
      setHintDialogOpen(false);
    });

    return () => {
      listener.remove();
    };
  }, []);

  const keyboardVisible = useKeyboardVisible();

  if (!allWords) {
    return;
  }

  const cellWidth = 48;

  const submitWordGuess = () => {
    const updatedGameState = { ...gameState };
    updateWordSubmission(updatedGameState, wordGuessIndex!, wordGuess);
    setGameState(updatedGameState);
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

      <GameTitle>{t("Crossword")}</GameTitle>

      <ScoreRow>
        <IncorrectScore score={gameState.incorrectSubmissions} />
        <HintScore score={gameState.hintsRemaining} />
      </ScoreRow>

      <ScrollView
        style={styles.outerScrollView}
        contentContainerStyle={styles.outerScrollViewContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <ScrollView
          nestedScrollEnabled
          horizontal
          style={styles.innerScrollView}
          contentContainerStyle={styles.innerScrollViewContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <View
            style={{
              width: cellWidth * gameState.board.width,
              height: cellWidth * gameState.board.height,
              position: "relative",
              margin: 8,
            }}
          >
            {gameState.board.cells.map((cell, i) => (
              <Pressable
                key={i}
                style={[
                  theme.styles.borders,
                  theme.styles.definitionBackground,
                  styles.cell,
                  {
                    position: "absolute",
                    left: cellWidth * (cell.x - gameState.board.left),
                    top: cellWidth * (cell.y - gameState.board.top),
                    width: cellWidth,
                    height: cellWidth,
                  },
                ]}
                disabled={gameState.over || cell.words.length > 1}
                onTouchEnd={(e) => e.stopPropagation()}
                onPress={() => {
                  const { wordIndex } = cell.words[0];
                  const word = gameState.board.words[wordIndex];
                  let textValue = "";

                  for (const hash of word.cells) {
                    const cell = gameState.board.cellMap[hash];
                    if (cell.submitted == undefined) {
                      break;
                    }
                    textValue += cell.submitted;
                  }

                  setWordGuess(textValue);
                  setWordGuessIndex(wordIndex);
                }}
              >
                <Text
                  style={[
                    cell.locked ? theme.styles.poppingText : theme.styles.text,
                    styles.cellText,
                  ]}
                >
                  {cell.submitted}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {!keyboardVisible && (
        <View style={styles.submitView}>
          <CircleButton
            style={styles.submitButton}
            disabled={
              gameState.over ||
              gameState.board.cells.some((cell) => cell.submitted == undefined)
            }
            onPress={() => {
              const allCorrect = gameState.board.cells.every(
                (cell) => cell.submitted == cell.expected
              );

              const updatedGameState = { ...gameState };

              if (allCorrect) {
                updatedGameState.totalTimer.pause();
                updatedGameState.displayingResults = true;
                updatedGameState.over = true;

                setUserData((userData) => {
                  return updateStatistics(userData, (stats) => {
                    stats.crosswordsCompleted =
                      (stats.crosswordsCompleted ?? 0) + 1;
                  });
                });
              } else {
                updatedGameState.incorrectSubmissions++;
              }

              setGameState(updatedGameState);
            }}
          >
            <ConfirmReadyIcon size={48} color={theme.colors.primary.contrast} />
          </CircleButton>
        </View>
      )}

      {selectedWord && wordGuessIndex != null && (
        <DockedTextInputContainer>
          <DockedTextInputHintButton
            hintsRemaining={
              selectedWord.hintUsed ? undefined : gameState.hintsRemaining
            }
            onPress={() => {
              if (selectedWord.hintUsed) {
                setHintDialogOpen(true);
                return;
              }

              gameState.hintsRemaining--;
              selectedWord.hintUsed = true;
              setGameState({ ...gameState });

              const word = selectedWord.word;
              getWordDefinitions(userData.activeDictionary, word.toLowerCase())
                .then((result) => {
                  const gameState = { ...getGameState() };
                  const wordData = gameState.board.words[wordGuessIndex];

                  if (result && result.definitions.length > 0) {
                    const index = pickIndexWithLenUnbiased(
                      result.definitions.length
                    );
                    wordData.hint = result.definitions[index].definition;
                  } else {
                    wordData.hint = t("Missing_Definition_brack");
                  }

                  setHintDialogOpen(true);
                })
                .catch(logError);
            }}
          />
          <DockedTextInput
            autoFocus
            onChangeText={(text) => {
              setWordGuess(text);
              setHintDialogOpen(false);
            }}
            onSubmitEditing={submitWordGuess}
            submitBehavior="submit"
            value={wordGuess}
          />
          <DockedTextInputSubmitButton onPress={submitWordGuess} />
        </DockedTextInputContainer>
      )}

      <Dialog open={hintDialogOpen} onClose={() => setHintDialogOpen(false)}>
        <Span style={styles.hintDialog}>
          {gameState.board.words[wordGuessIndex!]?.hint}
        </Span>
      </Dialog>

      <ResultsDialog
        open={gameState.displayingResults}
        onClose={() => setGameState({ ...gameState, displayingResults: false })}
        onReplay={() => {
          const newState = initGameState();
          startGame(newState, allWords);
          setGameState(newState);
        }}
      >
        <ResultsRow>
          <ResultsLabel>{t("Total_Time")}</ResultsLabel>
          <ResultsClock seconds={gameState.totalTimer.seconds()} />
        </ResultsRow>

        <ResultsRow>
          <ResultsLabel>{t("Incorrect_Submissions")}</ResultsLabel>
          <ResultsIncorrectScore score={gameState.incorrectSubmissions} />
        </ResultsRow>

        <ResultsRow>
          <ResultsLabel>{t("Hints_Used")}</ResultsLabel>
          <ResultsHintScore
            score={gameState.board.words.length - gameState.hintsRemaining}
          />
        </ResultsRow>
      </ResultsDialog>
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cellText: {
    fontSize: 24,
  },
  outerScrollView: {
    flex: 1,
  },
  outerScrollViewContent: {
    flexGrow: 1,
  },
  innerScrollView: {
    flex: 1,
    flexGrow: 1,
  },
  innerScrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  submitView: {
    alignItems: "center",
    marginVertical: 12,
  },
  submitButton: {
    padding: 8,
  },
  hintDialog: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    textAlign: "center",
  },
});
