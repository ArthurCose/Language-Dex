import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { SubMenuIconButton } from "@/lib/components/icon-button";
import {
  DragVerticalLongIcon,
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
import { useUserDataContext } from "@/lib/contexts/user-data";
import { useTranslation } from "react-i18next";
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
} from "react-native-reorderable-list";
import {
  deleteWord,
  DictionaryData,
  namePartOfSpeech,
  updateDefinitionOrderKey,
  updateStatistics,
  WordDefinitionData,
} from "@/lib/data";
import { logError } from "@/lib/log";
import ConfirmationDialog from "@/lib/components/confirmation-dialog";

function Definition({
  item,
  word,
  dictionary,
}: {
  item: WordDefinitionData;
  word: string;
  dictionary: DictionaryData;
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
          onPress={() =>
            router.navigate(`/words/${word}/definition/${item.id}`)
          }
        >
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
        </Pressable>
      </View>

      <View style={theme.styles.separator} />
    </>
  );
}

export default function Word() {
  const { word } = useLocalSearchParams<{ word: string }>();
  const navigation = useNavigation();
  const [t] = useTranslation();
  const [userData, setUserData] = useUserDataContext();
  const theme = useTheme();
  const [deleteRequested, setDeleteRequested] = useState(false);

  const definitionMap = useWordDefinitions(userData.activeDictionary, [word]);
  const definitionData = definitionMap?.[word];
  const savedDefinitions = definitionData?.definitionsResult?.definitions;
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
            onPress={() => router.navigate(`/words/${word}/definition/add`)}
          />
        </SubMenuActions>
      </SubMenuTopNav>

      <Span style={[styles.block, styles.word]}>{word}</Span>
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
            promises.push(updateDefinitionOrderKey(definition.id, i));
          }

          Promise.all(promises)
            .then(() => {
              invalidateWordDefinitions(userData.activeDictionary, word);
            })
            .catch(logError);
        }}
        renderItem={({ item }) => (
          <Definition dictionary={dictionary} word={word} item={item} />
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
          setUserData((userData) => {
            userData = updateStatistics(userData, (stats) => {
              if (stats.definitions != undefined) {
                const count = savedDefinitions?.length ?? 0;
                stats.definitions = Math.max(stats.definitions - count, 0);
              }
            });

            return userData;
          });

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
    paddingTop: 0,
    paddingBottom: 12,
    paddingLeft: 16,
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
  },
  definitionBlock: {
    padding: 8,
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
});
