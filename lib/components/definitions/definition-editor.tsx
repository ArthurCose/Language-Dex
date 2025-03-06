import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/contexts/theme";
import { router } from "expo-router";
import CustomTextInput, {
  CustomMultilineTextInput,
} from "@/lib/components/custom-text-input";
import { useTranslation } from "react-i18next";
import { StyleSheet, View, ScrollView, Text, Pressable } from "react-native";
import {
  ArrowLeftIcon,
  ConfidenceIcon,
  DefinitionIcon,
  EducationIcon,
  ExampleIcon,
  NotesIcon,
  PartOfSpeechIcon,
  PlayAudioIcon,
  SaveIcon,
  TrashIcon,
} from "@/lib/components/icons";
import IconButton, { SubMenuIconButton } from "@/lib/components/icon-button";
import {
  invalidateWordDefinitions,
  useWordDefinition,
} from "@/lib/hooks/use-word-definitions";
import { useUserDataContext } from "@/lib/contexts/user-data";
import PartOfSpeechDropdown from "@/lib/components/definitions/part-of-speech-dropdown";
import ConfirmationDialog, {
  DiscardDialog,
} from "@/lib/components/confirmation-dialog";
import {
  deleteDefinition,
  getFileObjectPath,
  prepareNewPronunciation,
  updateStatistics,
  upsertDefinition,
} from "@/lib/data";
import { logError } from "@/lib/log";
import SubMenuTopNav, {
  SubMenuActions,
} from "@/lib/components/sub-menu-top-nav";
import useBackHandler from "@/lib/hooks/use-back-handler";
import { usePendingChangesDetection } from "@/lib/hooks/use-pending-changes-detection";
import PronunciationEditor from "./pronunciation-editor";
import { useAudioPlayer } from "expo-audio";
import { stripProtocol } from "@/lib/path";

type Props = {
  lowerCaseWord?: string;
  setLowerCaseWord: (word: string) => void;
  definitionId?: number;
  setDefinitionId: (id: number) => void;
};

function ConfidenceButton({
  confidence,
  representedConfidence,
  setConfidence,
}: {
  confidence: number;
  representedConfidence: number;
  setConfidence: (c: number) => void;
}) {
  return (
    <Pressable
      style={styles.confidencePressable}
      onPress={() => setConfidence(representedConfidence)}
    >
      <ConfidenceIcon
        confidence={representedConfidence}
        style={
          confidence == representedConfidence
            ? undefined
            : styles.transparentIcon
        }
        size={32}
      />
    </Pressable>
  );
}

export default function DefinitionEditor(props: Props) {
  const theme = useTheme();
  const [t] = useTranslation();
  const [userData, setUserData] = useUserDataContext();

  const [definitionLoaded, definitionData] = useWordDefinition(
    userData.activeDictionary,
    props.lowerCaseWord,
    props.definitionId
  );

  const [saving, setSaving] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const [spelling, setSpelling] = useState(
    definitionData?.spelling ?? props.lowerCaseWord ?? ""
  );
  const [pronunciationUri, setPronunciationUri] = useState(
    getFileObjectPath(definitionData?.pronunciationAudio) ?? null
  );
  const [confidence, setConfidence] = useState(definitionData?.confidence ?? 0);
  const [partOfSpeech, setPartOfSpeech] = useState(
    definitionData?.partOfSpeech ?? null
  );
  const [definition, setDefinition] = useState(
    definitionData?.definition ?? ""
  );
  const [example, setExample] = useState(definitionData?.example ?? "");
  const [notes, setNotes] = useState(definitionData?.notes ?? "");

  useEffect(() => {
    if (definitionData) {
      setSpelling(definitionData.spelling);
      setPronunciationUri(
        getFileObjectPath(definitionData.pronunciationAudio) ?? null
      );
      setConfidence(definitionData.confidence);
      setPartOfSpeech(definitionData.partOfSpeech ?? null);
      setDefinition(definitionData.definition);
      setExample(definitionData.example);
      setNotes(definitionData.notes);
    }
  }, [definitionData]);

  // detecting pending changes
  const [hasPendingChanges, setHasPendingChanges] = usePendingChangesDetection([
    spelling,
    confidence,
    partOfSpeech,
    definition,
    example,
    notes,
  ]);

  useBackHandler(() => {
    if (hasPendingChanges) {
      setDiscardDialogOpen(true);
      return true;
    }
  }, [hasPendingChanges]);

  const save = async () => {
    setSaving(true);
    setHasPendingChanges(false);

    try {
      const lowerCaseSpelling = spelling.toLowerCase().trim();
      const migratingWords =
        props.lowerCaseWord != lowerCaseSpelling &&
        props.definitionId != undefined;

      // handle pronunciation files
      const preparedPronunciation = await prepareNewPronunciation(
        definitionData,
        pronunciationUri
      );

      // create or update the word
      const definitionId = await upsertDefinition(userData.activeDictionary, {
        // coercion to force interpretation as a full "insert"
        // making all required fields required
        id: props.definitionId!,
        spelling: spelling.trim(),
        pronunciationAudio: preparedPronunciation.pronunciationAudio,
        partOfSpeech,
        definition,
        example,
        notes,
        confidence,
      });

      // finalize pronunciation
      preparedPronunciation.finalize();

      // update statistics
      const newDefinition = props.definitionId == undefined;
      const hadPronunciation = definitionData?.pronunciationAudio != undefined;
      const hasNewPronunciation =
        preparedPronunciation.pronunciationAudio != undefined;
      let pronunciationIncrease = 0;

      if (hadPronunciation && !hasNewPronunciation) {
        pronunciationIncrease = -1;
      } else if (!hadPronunciation && hasNewPronunciation) {
        pronunciationIncrease = 1;
      }

      setUserData((userData) => {
        userData = updateStatistics(userData, (stats) => {
          if (newDefinition) {
            stats.definitions = (stats.definitions ?? 0) + 1;
          }

          stats.totalPronounced = Math.max(
            (stats.totalPronounced ?? 0) + pronunciationIncrease,
            0
          );
        });

        return userData;
      });

      // keep identifiers in sync
      props.setLowerCaseWord(lowerCaseSpelling);
      props.setDefinitionId(definitionId);

      // invalidate the old word
      if (migratingWords && props.lowerCaseWord != undefined) {
        invalidateWordDefinitions(
          userData.activeDictionary,
          props.lowerCaseWord
        );
      }

      // invalidate the new word
      invalidateWordDefinitions(userData.activeDictionary, lowerCaseSpelling);
    } catch (e) {
      logError(e);
    }

    setSaving(false);
  };

  const audioPlayer = useAudioPlayer(stripProtocol(pronunciationUri));

  const saveDisabled =
    deleteRequested ||
    saving ||
    !definitionLoaded ||
    definition.trim().length == 0 ||
    spelling.trim().length == 0 ||
    !hasPendingChanges;

  return (
    <>
      <SubMenuTopNav>
        <SubMenuIconButton
          icon={ArrowLeftIcon}
          onPress={() => {
            if (hasPendingChanges) {
              setDiscardDialogOpen(true);
            } else {
              router.back();
            }
          }}
        />

        <SubMenuActions>
          {props.definitionId != undefined && (
            <SubMenuIconButton
              icon={TrashIcon}
              disabled={deleteRequested}
              onPress={() => setDeleteRequested(true)}
            />
          )}

          <SubMenuIconButton
            icon={SaveIcon}
            disabled={saveDisabled}
            onPress={save}
          />
        </SubMenuActions>
      </SubMenuTopNav>

      <ScrollView>
        <View style={styles.row}>
          <CustomTextInput
            style={[styles.input, styles.word]}
            placeholder={t("word")}
            value={spelling}
            onChangeText={setSpelling}
          />

          <View style={styles.pronunciationGroup}>
            <PronunciationEditor
              saved={!saving}
              pronunciationUri={
                getFileObjectPath(definitionData?.pronunciationAudio) ?? null
              }
              setPronunciationUri={(uri) => {
                if (uri != pronunciationUri) {
                  setPronunciationUri(uri);
                  setHasPendingChanges(true);
                }
              }}
            />

            <IconButton
              icon={PlayAudioIcon}
              disabled={pronunciationUri == undefined}
              onPress={() => {
                audioPlayer
                  .seekTo(0)
                  .then(() => {
                    audioPlayer.play();
                  })
                  .catch(logError);
              }}
            />
          </View>
        </View>

        <View style={theme.styles.separator} />

        <View style={styles.row}>
          <EducationIcon
            style={styles.iconLabel}
            color={theme.colors.iconButton}
            size={32}
          />

          <Text style={[styles.textInput, theme.styles.disabledText]}>
            {t("Confidence_paren")}
          </Text>

          <View style={styles.confidenceGroup}>
            <ConfidenceButton
              confidence={confidence}
              representedConfidence={-1}
              setConfidence={setConfidence}
            />
            <ConfidenceButton
              confidence={confidence}
              representedConfidence={0}
              setConfidence={setConfidence}
            />
            <ConfidenceButton
              confidence={confidence}
              representedConfidence={1}
              setConfidence={setConfidence}
            />
            <ConfidenceButton
              confidence={confidence}
              representedConfidence={2}
              setConfidence={setConfidence}
            />
          </View>
        </View>

        <View style={theme.styles.separator} />

        <View style={styles.row}>
          <PartOfSpeechIcon
            style={styles.iconLabel}
            color={theme.colors.iconButton}
            size={32}
          />
          <PartOfSpeechDropdown
            style={styles.input}
            labelStyle={styles.textInput}
            value={partOfSpeech}
            onChange={setPartOfSpeech}
          />
        </View>

        <View style={theme.styles.separator} />

        <View style={styles.row}>
          <DefinitionIcon
            style={styles.iconLabel}
            color={theme.colors.iconButton}
            size={32}
          />
          <CustomMultilineTextInput
            style={[styles.input, styles.textInput]}
            verticalPadding={styles.textInput.paddingVertical}
            minHeight={128}
            placeholder={t("Definition")}
            value={definition}
            onChangeText={setDefinition}
          />
        </View>

        <View style={theme.styles.separator} />

        <View style={styles.row}>
          <ExampleIcon
            style={styles.iconLabel}
            color={theme.colors.iconButton}
            size={32}
          />
          <CustomMultilineTextInput
            style={[styles.input, styles.textInput]}
            verticalPadding={styles.textInput.paddingVertical}
            minHeight={128}
            placeholder={t("Example")}
            value={example}
            onChangeText={setExample}
          />
        </View>

        <View style={theme.styles.separator} />

        <View style={styles.row}>
          <NotesIcon
            style={styles.iconLabel}
            color={theme.colors.iconButton}
            size={32}
          />
          <CustomMultilineTextInput
            style={[styles.input, styles.textInput]}
            verticalPadding={styles.textInput.paddingVertical}
            minHeight={128}
            placeholder={t("Notes")}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View style={theme.styles.separator} />
      </ScrollView>

      <ConfirmationDialog
        open={deleteRequested}
        title={t("Delete_Title", { name: t("Definition") })}
        description={t("Delete_Definition_Desc")}
        confirmationText={t("Confirm")}
        onCancel={() => setDeleteRequested(false)}
        onConfirm={async () => {
          if (
            props.lowerCaseWord != undefined &&
            props.definitionId != undefined
          ) {
            await deleteDefinition(props.definitionId).catch(logError);
            invalidateWordDefinitions(
              userData.activeDictionary,
              props.lowerCaseWord
            );

            // update statistics
            setUserData((userData) => {
              userData = updateStatistics(userData, (stats) => {
                if (stats.definitions != undefined) {
                  stats.definitions = Math.max(stats.definitions - 1, 0);
                }

                if (
                  definitionData?.pronunciationAudio != undefined &&
                  stats.totalPronounced != undefined
                ) {
                  stats.totalPronounced = Math.max(
                    stats.totalPronounced - 1,
                    0
                  );
                }
              });

              return userData;
            });
          }

          setDeleteRequested(false);
          router.back();
        }}
      />

      <DiscardDialog
        open={discardDialogOpen}
        saveDisabled={saveDisabled}
        onCancel={() => setDiscardDialogOpen(false)}
        onDiscard={async () => {
          setDiscardDialogOpen(false);
          router.back();
        }}
        onSave={() =>
          save().then(() => {
            router.back();
          })
        }
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
    textAlignVertical: "top",
    height: 48,
  },
  iconLabel: {
    paddingLeft: 4,
    paddingTop: 6,
  },
  textInput: {
    fontSize: 18,
    paddingVertical: 12,
    paddingRight: 16,
    paddingLeft: 8,
  },
  input: {
    flex: 1,
  },
  row: {
    display: "flex",
    flexDirection: "row",
  },
  pronunciationGroup: {
    flex: 0,
    flexDirection: "row",
    marginRight: 4,
  },
  confidenceGroup: {
    marginLeft: "auto",
    flexDirection: "row",
    alignContent: "stretch",
    paddingRight: 4,
  },
  confidencePressable: {
    paddingHorizontal: 2,
  },
  transparentIcon: {
    opacity: 0.5,
  },
});
