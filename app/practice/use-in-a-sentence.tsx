import React, { useCallback, useEffect, useState } from "react";
import Animated, { useSharedValue } from "react-native-reanimated";
import { StyleSheet, View } from "react-native";
import { PracticeAd } from "@/lib/components/ads";
import {
  GameTitle,
  Saved,
  Score,
  ScoreRow,
} from "@/lib/components/practice/info";
import RouteRoot from "@/lib/components/route-root";
import SubMenuTopNav, {
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import { useTheme } from "@/lib/contexts/theme";
import { useTranslation } from "react-i18next";
import CustomTextInput, {
  TextInputCharacterCount,
} from "@/lib/components/custom-text-input";
import {
  GameWord,
  listGameWords,
  updateStatistics,
  upsertDefinition,
  UserData,
} from "@/lib/data";
import useWordDefinitions, {
  invalidateWordDefinitions,
} from "@/lib/hooks/use-word-definitions";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { logError } from "@/lib/log";
import { pickIndexWithLenBiased, swapToEnd } from "@/lib/practice/random";
import {
  DefinitionBubble,
  WordBubble,
} from "@/lib/components/practice/definition-bubbles";
import CircleButton from "@/lib/components/circle-button";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  CloseIcon,
  SaveIcon,
} from "@/lib/components/icons";
import useKeyboardVisible from "@/lib/hooks/use-keyboard-visible";
import { fadeTo } from "@/lib/practice/animations";
import Dialog, {
  DialogDescription,
  DialogTitle,
} from "@/lib/components/dialog";
import { Span } from "@/lib/components/text";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "@/lib/components/confirmation-dialog";
import SkipButton from "@/lib/components/practice/skip-button";

const MAX_LEN = 100;

type GameState = {
  loading: boolean;
  over: boolean;
  bagWords: GameWord[];
  bagLen: number;
  activeWord?: GameWord;
  activeWords: string[];
  score: number;
  saveCount: number;
  roundStarted: boolean;
};

function initGameState(words: GameWord[]) {
  const gameState: GameState = {
    loading: true,
    over: false,
    bagWords: words,
    bagLen: words.length,
    activeWords: [],
    score: 0,
    saveCount: 0,
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

function incrementSentencesConstructed(userData: UserData) {
  return updateStatistics(userData, (stats) => {
    stats.sentencesConstructed = (stats.sentencesConstructed ?? 0) + 1;
  });
}

export default function () {
  const theme = useTheme();
  const [userData, setUserData] = useUserDataContext();
  const [t] = useTranslation();

  const [resolvedAdSize, setResolvedAdSize] = useState(false);
  const onAdResize = useCallback(() => setResolvedAdSize(true), []);

  const [sentence, setSentence] = useState("");

  const [gameState, setGameState] = useState(() => initGameState([]));
  const definitionMap = useWordDefinitions(
    userData.activeDictionary,
    gameState.activeWords
  );

  useEffect(() => {
    listGameWords(userData.activeDictionary)
      .then((words) => {
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
  const opacityStyle = { opacity };
  const [transitioning, setTransitioning] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fadeTo(opacity, 1);
    setTransitioning(false);
    setGameState((gameState) => ({ ...gameState, roundStarted: false }));
  }, [gameState.roundStarted]);

  const advance = (callback?: () => void) => {
    setTransitioning(true);
    setSentence("");

    fadeTo(opacity, 0, () => {
      setGameState((gameState) => {
        gameState = { ...gameState };
        setUpNextRound(gameState);
        return gameState;
      });

      if (typeof callback == "function") {
        callback();
      }
    });
  };

  // rendering
  const keyboardVisible = useKeyboardVisible();
  const definitionData =
    definitionMap[gameState.activeWords[0]]?.definitionsResult?.definitions[
      gameState.activeWord?.orderKey ?? 0
    ];

  return (
    <RouteRoot>
      <SubMenuTopNav>
        <SubMenuBackButton />
      </SubMenuTopNav>

      <GameTitle>{t("Use_in_a_Sentence")}</GameTitle>

      <ScoreRow>
        <Saved value={gameState.saveCount} />
        <Score score={gameState.score} />
      </ScoreRow>

      <PracticeAd onSizeChange={onAdResize} />

      <Animated.View style={[styles.wordAndDefinitionBlock, opacityStyle]}>
        <WordBubble>{definitionData?.spelling}</WordBubble>
        <DefinitionBubble>{definitionData?.definition}</DefinitionBubble>
      </Animated.View>

      <View
        style={[
          styles.textInputView,
          theme.styles.scanTextInput,
          keyboardVisible && styles.textInputKeyboardVisible,
        ]}
      >
        <CustomTextInput
          style={[styles.textInput, theme.styles.scanText]}
          editable
          multiline
          value={sentence}
          placeholder={t("use_in_a_sentence_placeholder")}
          onChangeText={setSentence}
          maxLength={MAX_LEN}
        />

        <TextInputCharacterCount text={sentence} maxLen={MAX_LEN} />
      </View>

      {!keyboardVisible && (
        <>
          <View style={styles.buttonsBlock}>
            <View style={styles.buttonsRow}>
              <CircleButton
                style={[styles.circleButton]}
                disabled={sentence.length == 0}
                onPress={() => setSaveDialogOpen(true)}
              >
                <SaveIcon size={48} color={theme.colors.primary.contrast} />
              </CircleButton>

              <CircleButton
                style={[styles.circleButton]}
                disabled={sentence.length == 0}
                onPress={() => setSentence("")}
              >
                <CloseIcon size={48} color={theme.colors.primary.contrast} />
              </CircleButton>

              <CircleButton
                style={[styles.circleButton]}
                disabled={sentence.length == 0 || transitioning}
                onPress={() => {
                  advance();
                  setUserData(incrementSentencesConstructed);
                  setGameState((gameState) => ({
                    ...gameState,
                    score: gameState.score + 1,
                  }));
                }}
              >
                <ArrowRightIcon
                  size={48}
                  color={theme.colors.primary.contrast}
                />
              </CircleButton>
            </View>

            <View style={styles.buttonsRow}>
              <SkipButton onPress={() => advance()} />
            </View>
          </View>
        </>
      )}

      <Dialog
        open={saveDialogOpen}
        onClose={saving ? undefined : () => setSaveDialogOpen(false)}
      >
        <DialogTitle>{t("Save_Sentence_as_Example")}</DialogTitle>

        <View style={styles.diff}>
          {definitionData != undefined && definitionData.example.length > 0 && (
            <>
              <Span>{definitionData?.example}</Span>
              <ArrowDownIcon color={theme.colors.text} size={32} />
            </>
          )}
          <Span>{sentence}</Span>
        </View>

        <DialogDescription>
          {t("Save_Sentence_as_Example_Desc", {
            word: definitionData?.spelling,
          })}
        </DialogDescription>

        <ConfirmationDialogActions>
          <ConfirmationDialogAction
            disabled={saving}
            onPress={() => setSaveDialogOpen(false)}
          >
            {t("Cancel")}
          </ConfirmationDialogAction>

          <ConfirmationDialogAction
            disabled={saving}
            onPress={() => {
              const save = async () => {
                // update the word
                await upsertDefinition(userData.activeDictionary, {
                  id: definitionData!.id,
                  spelling: definitionData!.spelling,
                  example: sentence,
                });

                setUserData(incrementSentencesConstructed);
                setGameState((gameState) => ({
                  ...gameState,
                  saveCount: gameState.saveCount + 1,
                  score: gameState.score + 1,
                }));

                advance(() => {
                  invalidateWordDefinitions(
                    userData.activeDictionary,
                    definitionData!.spelling.toLowerCase()
                  );
                });
                setSaveDialogOpen(false);
              };

              save()
                .catch(logError)
                .then(() => {
                  setSaving(false);
                })
                .catch(logError);
            }}
          >
            {t("Confirm")}
          </ConfirmationDialogAction>
        </ConfirmationDialogActions>
      </Dialog>
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  textInputView: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    textAlignVertical: "top",
  },
  textInputKeyboardVisible: {
    marginBottom: 8,
  },
  wordAndDefinitionBlock: {
    margin: 8,
    flex: 1,
    justifyContent: "center",
  },
  definitionBlock: {
    flex: 1,
    justifyContent: "center",
  },
  buttonsBlock: {
    margin: 16,
    gap: 16,
    justifyContent: "space-evenly",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  circleButton: {
    padding: 8,
  },
  diff: {
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  skip: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
