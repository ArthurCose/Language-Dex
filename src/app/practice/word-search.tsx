import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
  GestureResponderEvent,
} from "react-native";
import { Timer } from "@/src/lib/practice/timer";
import {
  getWordDefinitions,
  listWords,
  maxConfidence,
  updateStatistics,
} from "@/src/lib/data";
import { logError } from "@/src/lib/log";
import { useTranslation } from "react-i18next";
import { useUserDataSignal } from "@/src/lib/contexts/user-data-context";
import {
  Signal,
  useSignal,
  useSignalLens,
  useSignalValue,
} from "@/src/lib/hooks/use-signal";
import RouteRoot from "@/src/lib/components/route-root";
import {
  ResultsClock,
  ResultsDialog,
  ResultsConcededScore,
  ResultsLabel,
  ResultsRow,
} from "@/src/lib/components/practice/results";
import { useTheme } from "@/src/lib/contexts/theme-context";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
} from "@/src/lib/components/sub-menu-top-nav";
import IconButton, {
  SubMenuIconButton,
} from "@/src/lib/components/icon-button";
import {
  CancelEditIcon,
  ConcedeIcon,
  DefinitionIcon,
  PracticeResultsIcon,
  QuestionMarkIcon,
} from "@/src/lib/components/icons";
import { ConcededScore, ScoreRow } from "@/src/lib/components/practice/info";
import { pickIndexWithLenUnbiased } from "@/src/lib/practice/random";
import Dialog from "@/src/lib/components/dialog";
import { Span } from "@/src/lib/components/text";
import {
  generateWordSearch,
  WordSearch,
  BoardWordData,
} from "@/src/lib/practice/word-search-generation";
import React from "react";
import { PressableRef } from "@rn-primitives/types";
import ConfidenceStrip from "@/src/lib/components/definitions/confidence-strip";

const BOARD_SIZE = 10;

type GameState = {
  over: boolean;
  displayingResults: boolean;
  board: WordSearch;
  conceded: number;
  totalTimer: Timer;
};

type Selection = {
  wordIndex: number;
  x: number;
  y: number;
  xStep: number;
  yStep: number;
  length: number;
};

function initGameState() {
  const gameState: GameState = {
    over: false,
    displayingResults: false,
    board: {
      cells: [],
      words: [],
      overlaps: 0,
    },
    conceded: 0,
    totalTimer: new Timer(),
  };

  return gameState;
}

function startGame(gameState: GameState, words: string[]) {
  gameState.board = generateWordSearch(words, BOARD_SIZE);
  gameState.totalTimer.resume();
}

function updateSelection(
  selectionsSignal: Signal<Selection[]>,
  index: number,
  callback: (selection: Selection, selections: Selection[]) => void,
) {
  const selections = selectionsSignal.get();
  let selection = selections.find((s) => s.wordIndex == index);

  if (selection) {
    selection = { ...selection };
  } else {
    selection = {
      wordIndex: index,
      x: 0,
      y: 0,
      length: 1,
      xStep: 1,
      yStep: 0,
    };
  }

  const newSelections = selections.filter((s) => s.wordIndex != index);
  newSelections.push(selection);
  callback(selection, newSelections);

  selectionsSignal.set(newSelections);
}

function Selections({
  selectionsSignal,
}: {
  selectionsSignal: Signal<Selection[]>;
}) {
  const selections = useSignalValue(selectionsSignal);

  return (
    <>
      {selections.map(({ wordIndex, x, y, length, xStep, yStep }) => {
        // resolve render width
        let width = cellSize * length;

        if (xStep != 0 && yStep != 0) {
          width *= sqrt2;
          width += cellSize - cellSize * sqrt2;
        }

        return (
          <View
            key={wordIndex}
            style={[
              styles.selection,
              {
                borderColor: selectionColors[wordIndex],
                width,
                transform: [
                  { translateX: x * cellSize },
                  { translateY: y * cellSize + 2 },
                  {
                    rotate: vectorToAngle[xStep.toString() + yStep],
                  },
                  { translateY: (cellSize - selectionHeight) * 0.5 },
                ],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const GlyphGrid = React.memo(({ cells }: { cells: string[][] }) => (
  <>
    {cells.map((row, y) => (
      <View key={y} style={styles.row}>
        {row.map((grapheme, x) => (
          <View key={x} style={styles.cell} pointerEvents="box-only">
            <Span style={styles.cellText}>{grapheme}</Span>
          </View>
        ))}
      </View>
    ))}
  </>
));

type Hint = {
  definition: string;
  definitionId?: number;
  confidence?: number;
};

function loadWords(activeDictionary: number) {
  return listWords(activeDictionary, {
    ascending: true,
    orderBy: "confidence",
    minLength: 2,
    maxLength: BOARD_SIZE,
    belowMaxConfidence: true,
  });
}

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary,
  );

  const [allWords, setAllWords] = useState<string[] | null>(null);
  const reloadingWordsSignal = useSignal(false);
  const [gameState, setGameState] = useState(() => initGameState());

  const boardRef = useRef<PressableRef | null>(null);

  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(
    null,
  );
  const selectionsSignal = useSignal<Selection[]>([]);

  const [hintDialogOpen, setHintDialogOpen] = useState(false);
  const [hints, setHints] = useState<{ [wordIndex: number]: Hint | undefined }>(
    {},
  );
  const [hintIndex, setHintIndex] = useState(0);
  const hintWord = gameState.board.words[hintIndex] as
    | BoardWordData
    | undefined;
  const hintData = hints[hintIndex];

  useEffect(() => {
    loadWords(activeDictionary)
      .then((words) => {
        setAllWords(words);

        const updatedGameState = { ...gameState };
        startGame(updatedGameState, words);
        setGameState(updatedGameState);
      })
      .catch(logError);
  }, []);

  const testBoard = (gameState: GameState, selections: Selection[]) => {
    if (gameState.over || selections.length != gameState.board.words.length) {
      return;
    }

    const allFound = selections.every(
      ({ wordIndex, x: xStart, y: yStart, xStep, yStep, length }) => {
        const { graphemes } = gameState.board.words[wordIndex];

        if (length != graphemes.length) {
          return false;
        }

        // force LTR interpretation, RTL is converted to LTR during generation
        if (xStep < 0 || (xStep == 0 && yStep < 0)) {
          console.log(yStart, yStep);
          yStart += yStep * (length - 1);
          yStep = -yStep;
          console.log(yStart, yStep);
        }

        if (xStep < 0) {
          console.log(xStart, xStep);
          xStart += xStep * (length - 1);
          xStep = -xStep;
          console.log(xStart, xStep);
        }

        for (let i = 0; i < length; i++) {
          const x = xStart + xStep * i;
          const y = yStart + yStep * i;

          if (gameState.board.cells[y][x] != graphemes[i]) {
            return false;
          }
        }

        return true;
      },
    );

    if (!allFound) {
      return;
    }

    gameState.totalTimer.pause();
    gameState.displayingResults = true;
    gameState.over = true;
    setHintDialogOpen(false);

    // update the word searchs completed statistic
    // as long as the user figured out at least one word on their own
    const foundAtLeastOne = gameState.board.words.some(
      (word) => !word.conceded,
    );

    if (foundAtLeastOne) {
      userDataSignal.set(
        updateStatistics(userDataSignal.get(), (stats) => {
          stats.wordSearchPuzzlesCompleted =
            (stats.wordSearchPuzzlesCompleted ?? 0) + 1;
        }),
      );
    }

    setGameState({ ...gameState });
  };

  const requestHint = (wordIndex: number) => {
    const wordData = gameState.board.words[wordIndex];

    setHintIndex(wordIndex);

    if (hints[wordIndex] != undefined) {
      setHintDialogOpen(true);
      return;
    }

    setGameState({ ...gameState });

    const word = wordData.word;
    getWordDefinitions(activeDictionary, word.toLowerCase())
      .then((result) => {
        if (result && result.definitions.length > 0) {
          const index = pickIndexWithLenUnbiased(result.definitions.length);
          const data = result.definitions[index];

          setHints({
            ...hints,
            [wordIndex]: {
              definitionId: data.id,
              definition: data.definition,
              confidence: 0,
            },
          });
        } else {
          setHints({
            ...hints,
            [wordIndex]: { definition: t("Missing_Definition_brack") },
          });
        }

        setHintDialogOpen(true);
      })
      .catch(logError);
  };

  const gridTouchStart = (event: GestureResponderEvent) => {
    if (
      selectedWordIndex == null ||
      gameState.board.words[selectedWordIndex].conceded
    ) {
      return;
    }

    const x = Math.floor(event.nativeEvent.locationX / cellSize);
    const y = Math.floor(event.nativeEvent.locationY / cellSize);

    updateSelection(selectionsSignal, selectedWordIndex, (selection) => {
      selection.x = x;
      selection.y = y;
      selection.length = 1;
      selection.xStep = 1;
      selection.yStep = 0;
    });
  };

  const clampSelection = (selection: Selection) => {
    for (let i = 0; i < selection.length; i++) {
      const y = selection.y + selection.yStep * i;
      const row = gameState.board.cells[y];

      if (!row) {
        selection.length = i;
        return;
      }

      const x = selection.x + selection.xStep * i;
      if (row[x] == null) {
        selection.length = i;
        return;
      }
    }
  };

  const gridTouchMove = (event: GestureResponderEvent) => {
    if (
      selectedWordIndex == null ||
      gameState.board.words[selectedWordIndex].conceded ||
      !boardRef.current
    ) {
      return;
    }

    boardRef.current.measure((_x, _y, _w, _h, pageX, pageY) => {
      const x = (event.nativeEvent.pageX - pageX) / cellSize;
      const y = (event.nativeEvent.pageY - pageY) / cellSize;

      updateSelection(selectionsSignal, selectedWordIndex, (selection) => {
        let newXStep = Math.floor(x) - selection.x;
        let newYStep = Math.floor(y) - selection.y;

        if (
          (Math.abs(newXStep) == Math.abs(newYStep) ||
            newXStep == 0 ||
            newYStep == 0) &&
          (newXStep != 0 || newYStep != 0)
        ) {
          selection.xStep = Math.max(-1, Math.min(1, newXStep));
          selection.yStep = Math.max(-1, Math.min(1, newYStep));
        }

        const xDiff =
          Math.abs((selection.x + 0.5 - x) * selection.xStep) + 0.75;
        const yDiff =
          Math.abs((selection.y + 0.5 - y) * selection.yStep) + 0.75;
        selection.length = Math.max(xDiff, yDiff, 1);

        if (selection.length < 0) {
          // avoid negative length
          selection.xStep = -selection.xStep;
          selection.yStep = -selection.yStep;
          selection.length = -selection.length;
        }

        clampSelection(selection);
      });
    });
  };

  const gridTouchCancel = () => {
    if (selectedWordIndex == null) {
      return;
    }

    updateSelection(
      selectionsSignal,
      selectedWordIndex,
      (selection, selections) => {
        selection.length = Math.round(selection.length);
        clampSelection(selection);

        if (selection.length > 1) {
          // using queueMicrotask to avoid "Cannot update a component while rendering a different component"
          // caused by updating external state while in a set state action (setSelections(() => {}))
          testBoard(gameState, selections);
          return;
        }

        // delete selection
        const selectionIndex = selections.findIndex(
          (s) => s.wordIndex == selectedWordIndex,
        );
        selections.splice(selectionIndex, 1);
      },
    );
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
      </ScoreRow>

      {/* <GameTitle>{t("Word_Search")}</GameTitle> */}

      {allWords && (
        <>
          <ScrollView
            style={styles.outerScrollView}
            scrollEnabled={selectedWordIndex == null}
            contentContainerStyle={styles.outerScrollViewContent}
          >
            <ScrollView
              nestedScrollEnabled
              horizontal
              scrollEnabled={selectedWordIndex == null}
              style={styles.innerScrollView}
              contentContainerStyle={styles.innerScrollViewContent}
            >
              <Pressable
                ref={boardRef}
                pointerEvents="box-only"
                onTouchStart={gridTouchStart}
                onTouchMove={gridTouchMove}
                onTouchCancel={gridTouchCancel}
                onTouchEnd={gridTouchCancel}
              >
                <GlyphGrid cells={gameState.board.cells} />
                <Selections selectionsSignal={selectionsSignal} />
              </Pressable>
            </ScrollView>
          </ScrollView>

          <ScrollView
            horizontal
            style={styles.wordListScrollView}
            contentContainerStyle={styles.wordList}
            fadingEdgeLength={{ start: 0, end: 32 }}
          >
            {gameState.board.words.map((wordData, i) => {
              const selected = selectedWordIndex == i;

              return (
                <Pressable
                  style={[
                    styles.wordButton,
                    selected
                      ? { borderColor: selectionColors[i] }
                      : theme.styles.borders,
                  ]}
                  key={wordData.word}
                  pointerEvents="box-only"
                  android_ripple={theme.ripples.popup}
                  onPress={() => {
                    if (i == selectedWordIndex) {
                      requestHint(i);
                    } else {
                      setSelectedWordIndex(i);
                    }
                  }}
                >
                  {wordData.conceded ? (
                    <ConcedeIcon
                      size={bubbleIconSize}
                      color={theme.colors.disabledText}
                    />
                  ) : selected ? (
                    <QuestionMarkIcon
                      size={bubbleIconSize}
                      color={theme.colors.disabledText}
                    />
                  ) : (
                    <DefinitionIcon
                      size={bubbleIconSize}
                      color={theme.colors.disabledText}
                    />
                  )}
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.wordButton, theme.styles.borders]}
              pointerEvents="box-only"
              android_ripple={theme.ripples.popup}
              onPress={() => {
                setSelectedWordIndex(null);
              }}
            >
              <CancelEditIcon
                size={bubbleIconSize}
                color={theme.colors.disabledText}
              />
            </Pressable>
          </ScrollView>

          <Dialog
            open={hintDialogOpen}
            onClose={() => setHintDialogOpen(false)}
          >
            <View style={styles.hintTitleContainer}>
              <Span style={styles.hintTitle}>
                {gameState.over || hintWord?.conceded
                  ? hintWord?.word
                  : t("short_answer_mystery")}
              </Span>

              {hintWord && (!gameState.over || hintWord?.conceded) && (
                <View style={styles.concedeButton}>
                  <IconButton
                    icon={ConcedeIcon}
                    disabled={hintWord?.conceded}
                    onPress={() => {
                      const updatedGameState = {
                        ...gameState,
                      };
                      hintWord.conceded = true;
                      updatedGameState.conceded += 1;

                      // update the selection
                      const oldSelections = selectionsSignal.get();
                      const updatedSelections = [
                        ...oldSelections.filter(
                          (s) => s.wordIndex != hintIndex,
                        ),
                        {
                          wordIndex: hintIndex,
                          x: hintWord.x,
                          y: hintWord.y,
                          length: hintWord.graphemes.length,
                          xStep: hintWord.vector[0],
                          yStep: hintWord.vector[1],
                        },
                      ];
                      selectionsSignal.set(updatedSelections);

                      testBoard(updatedGameState, updatedSelections);
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
              <Span style={styles.hintText}>{hintData?.definition}</Span>
            </ScrollView>

            {hintWord &&
              hintData &&
              hintData.confidence != null &&
              (hintWord.conceded || gameState.over) && (
                <ConfidenceStrip
                  style={styles.confidenceStrip}
                  definitionId={hintData.definitionId}
                  confidence={hintData.confidence}
                  setConfidence={(confidence: number) => {
                    setHints({
                      ...hints,
                      [hintIndex]: { ...hintData, confidence },
                    });
                  }}
                />
              )}
          </Dialog>

          <ResultsDialog
            open={gameState.displayingResults}
            onClose={() => {
              if (reloadingWordsSignal.get()) {
                // don't close until words reload, acts as a weird lag signal to the user
                // we could maybe add some loading screen, preferrably we'll load too quickly for that to be necessary
                return;
              }

              setGameState({ ...gameState, displayingResults: false });
            }}
            onReplay={() => {
              if (reloadingWordsSignal.get()) {
                // already hit the replay button, just waiting for words to load
                return;
              }

              let wordList = allWords;

              const startNextGame = () => {
                const newState = initGameState();
                startGame(newState, wordList);
                setHints({});
                setSelectedWordIndex(null);
                selectionsSignal.set([]);
                reloadingWordsSignal.set(false);
                setGameState(newState);
              };

              // we need to reload the word list if a word was updated to max confidence
              const requiresReload = gameState.board.words.some(
                (_, i) => (hints[i]?.confidence ?? 0) == maxConfidence,
              );

              if (requiresReload) {
                reloadingWordsSignal.set(true);

                loadWords(activeDictionary)
                  .then((words) => {
                    // only update the word list if it leaves us with enough words to play
                    if (words.length >= 5) {
                      wordList = words;
                    }
                  })
                  .catch(logError)
                  .finally(startNextGame);

                return;
              }

              // we can start immediately
              startNextGame();
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
          </ResultsDialog>
        </>
      )}
    </RouteRoot>
  );
}

const cellSize = 36;
const selectionHeight = 30;
const bubbleIconSize = 24;
const sqrt2 = Math.sqrt(2);
const vectorToAngle: { [key: string]: string } = {
  "00": "0deg",
  "10": "0deg",
  "11": "45deg",
  "01": "90deg",
  "-11": "135deg",
  "-10": "180deg",
  "-1-1": "225deg",
  "0-1": "270deg",
  "1-1": "315deg",
};
export const selectionColors = [
  "#FF0050", // red
  "#FFA500", // orange
  "#EECC00", // yellow
  "#00DD00", // green
  "#00DDDD", // cyan
  "#0880FF", // blue
  "#A500FF", // magenta
];

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    aspectRatio: 1,
  },
  cellText: {
    fontSize: 24,
  },
  selection: {
    height: selectionHeight,
    position: "absolute",
    transformOrigin: [cellSize * 0.5, cellSize * 0.5, 0],
    borderWidth: 2,
    borderRadius: cellSize,
  },
  wordListScrollView: {
    flexGrow: 0,
  },
  wordList: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    paddingRight: 24,
    gap: 4,
  },
  wordButton: {
    aspectRatio: 1,
    height: 48,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    overflow: "hidden",
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
  confidenceStrip: {
    marginTop: -4,
    marginBottom: 8,
  },
});
