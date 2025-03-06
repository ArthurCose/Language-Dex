import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, Animated, useAnimatedValue } from "react-native";
import { PracticeAd } from "@/lib/components/ads";
import RouteRoot from "@/lib/components/route-root";
import SubMenuTopNav, {
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import RecordAudioButton from "@/lib/components/record-audio-button";
import * as FileSystem from "expo-file-system";
import { logError } from "@/lib/log";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";
import useGettableState from "@/lib/hooks/use-gettable-state";
import {
  GameWord,
  getFileObjectPath,
  listGameWords,
  prepareNewPronunciation,
  upsertDefinition,
} from "@/lib/data";
import { pickIndexWithLenBiased, swapToEnd } from "@/lib/practice/random";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { useTheme } from "@/lib/contexts/theme";
import { useAudioPlayer } from "expo-audio";
import CircleButton from "@/lib/components/circle-button";
import {
  ArrowRightIcon,
  PlayAudioIcon,
  RetryIcon,
  SaveIcon,
  ThumbDownIcon,
  ThumbUpIcon,
} from "@/lib/components/icons";
import { fadeTo } from "@/lib/practice/animations";
import { Saved, ScoreRow, ThumbsUps } from "@/lib/components/practice/info";
import ConfirmationDialog from "@/lib/components/confirmation-dialog";
import { useTranslation } from "react-i18next";
import useAnimationEffects from "@/lib/hooks/use-animation-effects";
import {
  DefinitionBubble,
  WordBubble,
} from "@/lib/components/practice/definition-bubbles";
import { stripProtocol } from "@/lib/path";

type GameState = {
  loading: boolean;
  over: boolean;
  bagWords: GameWord[];
  bagLen: number;
  activeWord?: GameWord;
  activeWords: string[];
  score: number;
  saveCount: number;
  selfReporting: boolean;
  currentReport?: boolean;
  recording?: string;
  savedRecording?: boolean;
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
    selfReporting: false,
  };

  return gameState;
}

function setUpNextRound(gameState: GameState) {
  if (gameState.bagLen == 0) {
    gameState.bagLen = gameState.bagWords.length;
  }

  const bagIndex = pickIndexWithLenBiased(gameState.bagLen);
  gameState.activeWord = swapToEnd(
    gameState.bagWords,
    gameState.bagLen,
    bagIndex
  );
  gameState.bagLen -= 1;

  if (!gameState.activeWord) {
    gameState.activeWords = [];
    return;
  }

  gameState.activeWords = [gameState.activeWord.spelling.toLowerCase()];
}

export default function () {
  const theme = useTheme();
  const [userData] = useUserDataContext();
  const [t] = useTranslation();

  const [resolvedAdSize, setResolvedAdSize] = useState(false);
  const onAdResize = useCallback(() => setResolvedAdSize(true), []);

  const [gameState, setGameState, getGameState] = useGettableState(() =>
    initGameState([])
  );
  const definitionMap = useWordDefinitions(
    userData.activeDictionary,
    gameState.activeWords
  );

  useEffect(() => {
    listGameWords(userData.activeDictionary, {
      requirePronunciation: true,
    })
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

  // recording cleanup
  useEffect(() => {
    return () => {
      const uri = getGameState().recording;

      if (uri != undefined) {
        FileSystem.deleteAsync(uri).catch(logError);
      }
    };
  }, []);

  // handle playing pronunciation
  const [pronunciationUri, setPronunciationUri] = useState<
    string | undefined
  >();
  const [startAudio, setStartAudio] = useState(false);
  const audioPlayer = useAudioPlayer(stripProtocol(pronunciationUri));

  useEffect(() => {
    if (startAudio) {
      audioPlayer
        .seekTo(0)
        .then(() => {
          audioPlayer.play();
        })
        .catch(logError);

      setStartAudio(false);
    }
  }, [startAudio]);

  // saving
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // transitions
  const [transitioning, setTransitioning] = useState(false);
  const definitionOpacity = useAnimatedValue(1);
  const inputOpacity = useAnimatedValue(1);
  const pushAnimation = useAnimationEffects();

  const transition = (transitionRound: boolean) => {
    setTransitioning(true);

    // delay with setTimeout to add some time for users to process their action
    setTimeout(() => {
      // fade out
      if (transitionRound) {
        fadeTo(definitionOpacity, 0);
      }

      fadeTo(inputOpacity, 0, () => {
        // swap view by toggling selfReporting
        setGameState((gameState) => {
          gameState = {
            ...gameState,
            selfReporting: !gameState.selfReporting,
            currentReport: undefined,
            savedRecording: false,
          };

          if (transitionRound) {
            setUpNextRound(gameState);
          }

          return gameState;
        });

        pushAnimation(() => {
          // fade back in
          fadeTo(inputOpacity, 1, () => setTransitioning(false));

          if (transitionRound) {
            fadeTo(definitionOpacity, 1);
          }
        });
      });
    }, 200);
  };

  const submitSelfReport = (thumbsUp: boolean) => {
    setGameState((gameState) => ({
      ...gameState,
      currentReport: thumbsUp,
      score: thumbsUp ? gameState.score + 1 : gameState.score,
      recording: undefined,
    }));

    transition(true);
  };

  const submitRecording = (uri?: string) => {
    if (uri == undefined) {
      return;
    }

    if (gameState.recording != undefined) {
      FileSystem.deleteAsync(gameState.recording).catch(logError);
    }

    setGameState((gameState) => ({ ...gameState, recording: uri }));
    transition(false);
  };

  // rendering
  const definitionData =
    definitionMap[gameState.activeWords[0]]?.definitionsResult?.definitions[
      gameState.activeWord?.orderKey ?? 0
    ];

  return (
    <RouteRoot>
      <SubMenuTopNav>
        <SubMenuBackButton />
      </SubMenuTopNav>

      <ScoreRow>
        <Saved value={gameState.saveCount} />
        <ThumbsUps value={gameState.score} />
      </ScoreRow>

      <PracticeAd onSizeChange={onAdResize} />

      {resolvedAdSize && !gameState.loading && (
        <>
          <Animated.View
            style={[styles.definitionBlock, { opacity: definitionOpacity }]}
          >
            <WordBubble>{gameState.activeWord?.spelling}</WordBubble>
            <DefinitionBubble>{definitionData?.definition}</DefinitionBubble>
          </Animated.View>

          {!gameState.selfReporting ? (
            <Animated.View style={[styles.bottom, { opacity: inputOpacity }]}>
              <RecordAudioButton
                ignoreInput={transitioning}
                onEnd={submitRecording}
              />
            </Animated.View>
          ) : (
            <Animated.View style={[styles.bottom, { opacity: inputOpacity }]}>
              <View style={styles.playAudioRow}>
                {definitionData?.pronunciationAudio != undefined && (
                  <>
                    <CircleButton
                      style={styles.circleButton}
                      onPress={() => {
                        const fileName = definitionData.pronunciationAudio;
                        const uri = getFileObjectPath(fileName)!;
                        setPronunciationUri(uri);
                        setStartAudio(true);
                      }}
                    >
                      <PlayAudioIcon
                        size={48}
                        color={theme.colors.primary.contrast}
                      />
                    </CircleButton>

                    <ArrowRightIcon size={48} color={theme.colors.iconButton} />
                  </>
                )}

                <CircleButton
                  style={styles.circleButton}
                  onPress={() => {
                    setPronunciationUri(gameState.recording);
                    setStartAudio(true);
                  }}
                >
                  <PlayAudioIcon
                    size={48}
                    color={theme.colors.primary.contrast}
                  />
                </CircleButton>
              </View>

              <View style={styles.saveRow}>
                <CircleButton
                  style={[
                    styles.circleButton,
                    theme.styles.definitionBackground,
                  ]}
                  ignoreInput={transitioning}
                  onPress={() => submitSelfReport(false)}
                >
                  <ThumbDownIcon size={48} color={theme.colors.iconButton} />
                </CircleButton>

                <CircleButton
                  style={[
                    styles.circleButton,
                    theme.styles.definitionBackground,
                  ]}
                  ignoreInput={transitioning}
                  onPress={() => transition(false)}
                >
                  <RetryIcon size={48} color={theme.colors.iconButton} />
                </CircleButton>

                <CircleButton
                  style={[
                    styles.circleButton,
                    theme.styles.definitionBackground,
                  ]}
                  ignoreInput={transitioning}
                  disabled={gameState.savedRecording}
                  onPress={() => setSaveDialogOpen(true)}
                >
                  <SaveIcon size={48} color={theme.colors.iconButton} />
                </CircleButton>

                <CircleButton
                  style={[
                    styles.circleButton,
                    theme.styles.definitionBackground,
                  ]}
                  ignoreInput={transitioning}
                  onPress={() => submitSelfReport(true)}
                >
                  <ThumbUpIcon size={48} color={theme.colors.iconButton} />
                </CircleButton>
              </View>
            </Animated.View>
          )}
        </>
      )}

      <ConfirmationDialog
        title={t("Overwrite")}
        description={t("Overwrite_Pronunciation_Desc")}
        open={saveDialogOpen}
        onConfirm={async () => {
          try {
            const gameState = { ...getGameState(), savedRecording: true };
            setGameState(gameState);

            const preparedPronunciation = await prepareNewPronunciation(
              definitionData,
              gameState.recording
            );

            if (
              preparedPronunciation.pronunciationAudio !=
              definitionData?.pronunciationAudio
            ) {
              // update the word
              await upsertDefinition(userData.activeDictionary, {
                id: definitionData!.id,
                spelling: definitionData!.spelling,
                pronunciationAudio: preparedPronunciation.pronunciationAudio,
              });
            }

            // finalize pronunciation
            preparedPronunciation.finalize();
          } catch (err) {
            logError(err);
          }

          submitSelfReport(true);
          setSaveDialogOpen(false);
          setGameState((gameState) => ({
            ...gameState,
            saveCount: gameState.saveCount + 1,
          }));
        }}
        onCancel={() => setSaveDialogOpen(false)}
      />
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  definitionBlock: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: 16,
  },
  bottom: {
    flex: 1,
    justifyContent: "space-evenly",
  },
  circleButton: {
    padding: 8,
  },
  playAudioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
});
