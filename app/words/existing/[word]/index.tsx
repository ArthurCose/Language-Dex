import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import IconButton, { SubMenuIconButton } from "@/lib/components/icon-button";
import {
  ConfidenceIcon,
  DragVerticalLongIcon,
  PlayAudioIcon,
  PlusIcon,
  TrashIcon,
} from "@/lib/components/icons";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
} from "@/lib/components/sub-menu-top-nav";
import { Span } from "@/lib/components/text";
import { useTheme } from "@/lib/contexts/theme";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import useWordDefinitions, {
  invalidateWordDefinitions,
} from "@/lib/hooks/use-word-definitions";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalValue } from "@/lib/hooks/use-signal";
import { useTranslation } from "react-i18next";
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
} from "react-native-reorderable-list";
import {
  deleteWord,
  DictionaryData,
  DictionaryWordStatKey,
  getFileObjectPath,
  maxConfidence,
  namePartOfSpeech,
  updateDefinitionOrderKey,
  updateStatistics,
  WordDefinitionData,
} from "@/lib/data";
import { logError } from "@/lib/log";
import ConfirmationDialog from "@/lib/components/confirmation-dialog";
import { useAudioPlayer } from "expo-audio";
import { stripProtocol } from "@/lib/path";

function Definition({
  item,
  encodedWord,
  dictionary,
  setPronunciationUri,
}: {
  item: WordDefinitionData;
  encodedWord: string;
  dictionary: DictionaryData;
  setPronunciationUri: (uri: string) => void;
}) {
  const theme = useTheme();
  const [t] = useTranslation();
  const drag = useReorderableDrag();

  return (
    <>
      <View style={[styles.draggableBlock, theme.styles.definitionBackground]}>
        <Pressable style={styles.drag} onTouchStart={drag}>
          <DragVerticalLongIcon color={theme.colors.iconButton} size={24} />
        </Pressable>

        <Pressable
          style={styles.definitionBlock}
          android_ripple={theme.ripples.transparentButton}
          pointerEvents="box-only"
          onPress={() =>
            router.navigate(
              `/words/existing/${encodedWord}/definition/${item.id}`
            )
          }
        >
          <View style={styles.definitionBody}>
            <Span style={[theme.styles.partOfSpeech]}>
              {namePartOfSpeech(dictionary, item.partOfSpeech) ?? t("unknown")}
            </Span>

            <Span style={styles.definition}>{item.definition}</Span>

            {item.example.trim().length > 0 && (
              <Span style={[styles.example, theme.styles.example]}>
                {item.example}
              </Span>
            )}

            {item.notes.trim().length > 0 && (
              <Span style={[styles.notes]}>{item.notes}</Span>
            )}
          </View>
        </Pressable>

        <View style={styles.zeroWidth}>
          <View style={styles.stickersContainer}>
            {item.confidence != 0 && (
              <ConfidenceIcon confidence={item.confidence} size={24} />
            )}

            {item.pronunciationAudio != undefined && (
              <IconButton
                icon={PlayAudioIcon}
                disabled={item.pronunciationAudio == undefined}
                onPress={() =>
                  setPronunciationUri(
                    getFileObjectPath(item.pronunciationAudio)!
                  )
                }
              />
            )}
          </View>
        </View>
      </View>

      <View style={theme.styles.separator} />
    </>
  );
}

export default function Word() {
  const { word } = useLocalSearchParams<{ word: string }>();
  const navigation = useNavigation();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const userData = useSignalValue(userDataSignal);
  const theme = useTheme();
  const [deleteRequested, setDeleteRequested] = useState(false);

  const definitionMap = useWordDefinitions(userData.activeDictionary, [word]);
  const definitionData = definitionMap?.[word];
  const definitionsResult = definitionData?.definitionsResult;
  const spelling = definitionsResult?.spelling ?? word;
  const savedDefinitions = definitionsResult?.definitions;
  const [definitions, setDefinitions] = useState(savedDefinitions ?? []);

  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
  )!;

  useEffect(() => {
    if (!definitionData || !definitionData.loaded || !navigation.isFocused()) {
      return;
    }

    if (!definitionData.definitionsResult) {
      navigation.goBack();
    }
  }, [definitionData?.loaded]);

  useEffect(() => {
    if (!definitionData?.definitionsResult) {
      return;
    }

    setDefinitions(definitionData.definitionsResult.definitions);
  }, [definitionData?.definitionsResult]);

  // handle pronunciation
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

  const encodedWord = encodeURIComponent(word);

  return (
    <>
      <SubMenuTopNav>
        <SubMenuBackButton />

        <SubMenuActions>
          <SubMenuIconButton
            icon={TrashIcon}
            disabled={deleteRequested || savedDefinitions == undefined}
            onPress={() => setDeleteRequested(true)}
          />

          <SubMenuIconButton
            icon={PlusIcon}
            onPress={() =>
              router.navigate(`/words/existing/${encodedWord}/definition/add`)
            }
          />
        </SubMenuActions>
      </SubMenuTopNav>

      <Span style={[styles.block, styles.word]}>{spelling}</Span>
      <View style={theme.styles.separator} />

      <ReorderableList
        data={definitions}
        onReorder={({ from, to }) => {
          const newList = reorderItems(definitions, from, to);
          setDefinitions(newList);

          const low = Math.min(from, to);
          const high = Math.max(from, to);

          const promises = [];

          for (let i = low; i <= high; i++) {
            const definition = newList[i];
            promises.push(updateDefinitionOrderKey(definition, i));
          }

          Promise.all(promises)
            .then(() => {
              invalidateWordDefinitions(userData.activeDictionary, word);
            })
            .catch(logError);
        }}
        renderItem={({ item }) => (
          <Definition
            dictionary={dictionary}
            encodedWord={encodedWord}
            setPronunciationUri={(uri) => {
              setPronunciationUri(uri);
              setStartAudio(true);
            }}
            item={item}
          />
        )}
        cellAnimations={{ scale: false }}
        keyExtractor={(item) => item.id.toString()}
      />

      <ConfirmationDialog
        open={deleteRequested}
        title={t("Delete_Title", { name: word })}
        description={t("Delete_Word_Desc")}
        confirmationText={t("Confirm")}
        onCancel={() => setDeleteRequested(false)}
        onConfirm={async () => {
          await deleteWord(userData.activeDictionary, word).catch(logError);
          invalidateWordDefinitions(userData.activeDictionary, word);

          // update statistics
          const wordStatList: [
            DictionaryWordStatKey,
            (definition: WordDefinitionData) => boolean
          ][] = [
            ["documentedMaxConfidence", (d) => d.confidence == maxConfidence],
            ["totalExamples", (d) => d.example != ""],
            ["totalPronounced", (d) => d.pronunciationAudio != undefined],
          ];

          userDataSignal.set(
            updateStatistics(userDataSignal.get(), (stats) => {
              if (stats.definitions != undefined) {
                const count = savedDefinitions?.length ?? 0;
                stats.definitions = Math.max(stats.definitions - count, 0);
              }

              for (const [statKey, filter] of wordStatList) {
                if (typeof stats[statKey] != "number") {
                  continue;
                }

                const count = savedDefinitions?.filter(filter).length ?? 0;
                stats[statKey] = Math.max(stats[statKey] - count, 0);
              }
            })
          );

          setDeleteRequested(false);
          router.back();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  word: {
    fontSize: 24,
    fontWeight: "bold",
    paddingTop: 4,
    paddingLeft: 16,
    height: 48,
  },
  drag: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  draggableBlock: {
    display: "flex",
    flexDirection: "row",
    alignItems: "stretch",
    position: "relative",
  },
  definitionBlock: {
    padding: 8,
    flex: 1,
    flexDirection: "row",
    // make room for the stickers container
    paddingRight: 60,
  },
  definitionBody: {
    flex: 1,
  },
  block: {
    padding: 8,
  },
  definition: {
    paddingLeft: 16,
  },
  example: {
    marginTop: 4,
    paddingLeft: 16,
  },
  notes: {
    marginTop: 16,
    paddingLeft: 16,
  },
  stickersContainer: {
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
    transform: [{ translateX: "-100%" }],
    marginTop: 8,
    marginBottom: 8,
    gap: 2,
    width: 56,
  },
  zeroWidth: {
    width: 0,
  },
});
