import React, { useCallback, useEffect, useState } from "react";
import {
  Text,
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  Keyboard,
} from "react-native";
import { Timer } from "@/lib/practice/timer";
import useGettableState from "@/lib/hooks/use-gettable-state";
import { getWordDefinitions, listWords, updateStatistics } from "@/lib/data";
import { logError } from "@/lib/log";
import { useTranslation } from "react-i18next";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalLens } from "@/lib/hooks/use-signal";
import RouteRoot from "@/lib/components/route-root";
import {
  DockedTextInput,
  DockedTextInputContainer,
  DockedTextInputHintButton,
  DockedTextInputSubmitButton,
} from "@/lib/components/practice/docked-text-input";
import {
  ResultsClock,
  ResultsDialog,
  ResultsHintScore,
  ResultsConcededScore,
  ResultsLabel,
  ResultsRow,
} from "@/lib/components/practice/results";
import { useTheme } from "@/lib/contexts/theme";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import IconButton, { SubMenuIconButton } from "@/lib/components/icon-button";
import { ConcedeIcon, PracticeResultsIcon } from "@/lib/components/icons";
import {
  ConcededScore,
  HintScore,
  ScoreRow,
} from "@/lib/components/practice/info";
import {
  Crossword,
  generateCrossword,
} from "@/lib/practice/crossword-generation";
import { isRTL, toGraphemeStrings } from "@/lib/practice/words";
import { pickIndexWithLenUnbiased } from "@/lib/practice/random";
import Dialog from "@/lib/components/dialog";
import { Span } from "@/lib/components/text";
import { PracticeAd } from "@/lib/components/ads";

type GameState = {
  over: boolean;
  displayingResults: boolean;
  board: Crossword;
  hintsRemaining: number;
  conceded: number;
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
    conceded: 0,
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

  const submittedGraphemes = toGraphemeStrings(text.toLowerCase());
  const rtl =
    submittedGraphemes[0] != undefined
      ? isRTL(submittedGraphemes[0])
      : undefined;

  const rtlStart = rtl
    ? selectedWord.cells.length - submittedGraphemes.length
    : 0;
  const reversedSpace = Math.max(rtlStart, 0);

  for (let i = 0; i < reversedSpace; i++) {
    const cellKey = selectedWord.cells[i];
    const cell = board.cellMap[cellKey];

    if (!cell.locked) {
      cell.submitted = undefined;
    }
  }

  // iterate over cells to update submissions even on crossing words
  for (let i = reversedSpace; i < selectedWord.cells.length; i++) {
    const cellKey = selectedWord.cells[i];
    const cell = board.cellMap[cellKey];

    if (cell.locked) {
      continue;
    }

    // update the text submitted to this cell
    cell.submitted = submittedGraphemes[i - rtlStart];
  }
}

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary
  );
  const [resolvedAdSize, setResolvedAdSize] = useState(false);
  const onAdResize = useCallback(() => setResolvedAdSize(true), []);

  const [allWords, setAllWords] = useState<string[] | null>(null);
  const [gameState, setGameState, getGameState] = useGettableState(() =>
    initGameState()
  );
  const [wordGuess, setWordGuess] = useState("");
  const [wordGuessIndex, setWordGuessIndex] = useState<number | null>(null);
  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    listWords(activeDictionary, {
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

  const cellWidth = 48;

  const testBoard = (gameState: GameState) => {
    const allCorrect = gameState.board.cells.every(
      (cell) => cell.submitted == cell.expected
    );

    if (!allCorrect) {
      return;
    }

    gameState.totalTimer.pause();
    gameState.displayingResults = true;
    gameState.over = true;
    setHintDialogOpen(false);

    const allLocked = gameState.board.cells.every((cell) => cell.locked);

    if (!allLocked) {
      // update the crosswords completed statistic
      // as long as the user figured out at least one word on their own
      userDataSignal.set(
        updateStatistics(userDataSignal.get(), (stats) => {
          stats.crosswordsCompleted = (stats.crosswordsCompleted ?? 0) + 1;
        })
      );
    }
  };

  const submitWordGuess = () => {
    const updatedGameState = { ...gameState };
    updateWordSubmission(updatedGameState, wordGuessIndex!, wordGuess);
    testBoard(updatedGameState);
    setGameState(updatedGameState);
  };

  const requestHint = (wordIndex: number) => {
    const wordData = gameState.board.words[wordIndex];

    setHintIndex(wordIndex);

    if (wordData.hintUsed) {
      setHintDialogOpen(true);
      return;
    }

    if (!gameState.over) {
      gameState.hintsRemaining--;
    }

    wordData.hintUsed = true;
    setGameState({ ...gameState });

    const word = wordData.word;
    getWordDefinitions(activeDictionary, word.toLowerCase())
      .then((result) => {
        const gameState = { ...getGameState() };
        const wordData = gameState.board.words[wordIndex];

        if (result && result.definitions.length > 0) {
          const index = pickIndexWithLenUnbiased(result.definitions.length);
          wordData.hint = result.definitions[index].definition;
        } else {
          wordData.hint = t("Missing_Definition_brack");
        }

        setHintDialogOpen(true);
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
              icon={PracticeResultsIcon}
              onPress={() =>
                setGameState({ ...gameState, displayingResults: true })
              }
            />
          )}
        </SubMenuActions>
      </SubMenuTopNav>

      <ScoreRow>
        <ConcededScore score={gameState.conceded} />
        <HintScore score={gameState.hintsRemaining} />
      </ScoreRow>

      {/* <GameTitle>{t("Crossword")}</GameTitle> */}
      <PracticeAd onSizeChange={onAdResize} />

      {resolvedAdSize && allWords && (
        <>
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
                    onTouchEnd={(e) => e.stopPropagation()}
                    onPress={() => {
                      let { wordIndex } = cell.words[0];

                      if (
                        wordIndex == wordGuessIndex &&
                        cell.words.length > 1
                      ) {
                        // view the other option
                        wordIndex = cell.words[1].wordIndex;
                      }

                      if (gameState.over) {
                        requestHint(wordIndex);
                        return;
                      }

                      const word = gameState.board.words[wordIndex];
                      let textValue = "";

                      let cells = word.cells;

                      // handle rtl
                      if (isRTL(word.graphemes[0])) {
                        cells = cells.toReversed();
                      }

                      for (const hash of cells) {
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
                        cell.locked
                          ? theme.styles.poppingText
                          : theme.styles.text,
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

          {wordGuessIndex != null && !gameState.over && (
            <DockedTextInputContainer>
              <DockedTextInputHintButton
                hintsRemaining={
                  gameState.board.words[wordGuessIndex].hintUsed
                    ? undefined
                    : gameState.hintsRemaining
                }
                onPress={() => requestHint(wordGuessIndex)}
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

          <Dialog
            open={hintDialogOpen}
            onClose={() => setHintDialogOpen(false)}
          >
            <View style={styles.hintTitleContainer}>
              <Span style={styles.hintTitle}>
                {gameState.over || gameState.board.words[hintIndex].conceded
                  ? gameState.board.words[hintIndex].word
                  : t("short_answer_mystery")}
              </Span>

              {(!gameState.over ||
                gameState.board.words[hintIndex].conceded) && (
                <View style={styles.concedeButton}>
                  <IconButton
                    icon={ConcedeIcon}
                    disabled={gameState.board.words[hintIndex].conceded}
                    onPress={() => {
                      const updatedGameState = {
                        ...gameState,
                      };
                      const word = updatedGameState.board.words[hintIndex];
                      word.conceded = true;
                      updatedGameState.conceded += 1;

                      setWordGuess(word.word);

                      for (let i = 0; i < word.cells.length; i++) {
                        const cell =
                          updatedGameState.board.cellMap[word.cells[i]];
                        cell.submitted = cell.expected;
                        cell.locked = true;
                      }

                      testBoard(updatedGameState);
                      setGameState(updatedGameState);
                    }}
                  />
                </View>
              )}
            </View>

            <ScrollView
              keyboardDismissMode="none"
              keyboardShouldPersistTaps="always"
            >
              <Span style={styles.hintText}>
                {gameState.board.words[hintIndex].hint}
              </Span>
            </ScrollView>
          </Dialog>

          <ResultsDialog
            open={gameState.displayingResults}
            onClose={() =>
              setGameState({ ...gameState, displayingResults: false })
            }
            onReplay={() => {
              const newState = initGameState();
              startGame(newState, allWords);
              setGameState(newState);
              setWordGuessIndex(null);
            }}
          >
            <ResultsRow>
              <ResultsLabel>{t("Total_Time")}</ResultsLabel>
              <ResultsClock
                maxSeconds={Infinity}
                seconds={gameState.totalTimer.seconds()}
              />
            </ResultsRow>

            <ResultsRow>
              <ResultsLabel>{t("Words_Conceded")}</ResultsLabel>
              <ResultsConcededScore score={gameState.conceded} />
            </ResultsRow>

            <ResultsRow>
              <ResultsLabel>{t("Hints_Used")}</ResultsLabel>
              <ResultsHintScore
                score={gameState.board.words.length - gameState.hintsRemaining}
              />
            </ResultsRow>
          </ResultsDialog>
        </>
      )}
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
  hintTitleContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  hintTitle: {
    fontSize: 20,
    textAlign: "center",
    paddingTop: 8,
    flex: 1,
    marginHorizontal: 64,
  },
  hintText: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 64,
    textAlign: "center",
  },
  concedeButton: {
    position: "absolute",
    top: 0,
    right: 0,
  },
});
