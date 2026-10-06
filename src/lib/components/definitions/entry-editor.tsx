import { useEffect, useState } from "react";
import { StyleSheet, View, Text, ScrollView } from "react-native";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { router } from "expo-router";
import CustomTextInput, {
  CustomMultilineTextInput,
} from "@/src/lib/components/custom-text-input";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  DefinitionIcon,
  EducationIcon,
  ExampleIcon,
  NotesIcon,
  PartOfSpeechIcon,
  PlayAudioIcon,
  SaveIcon,
  TrashIcon,
  WordRelationIcon,
} from "@/src/lib/components/icons";
import IconButton, {
  SubMenuIconButton,
} from "@/src/lib/components/icon-button";
import {
  invalidateWordEntries,
  useWordEntry,
} from "@/src/lib/hooks/use-word-entries";
import { useUserDataSignal } from "@/src/lib/contexts/user-data-context";
import { useSignalLens, useSignalValue } from "@/src/lib/hooks/use-signal";
import PartOfSpeechDropdown from "@/src/lib/components/definitions/part-of-speech-dropdown";
import ConfirmationDialog, {
  DiscardDialog,
} from "@/src/lib/components/confirmation-dialog";
import {
  deleteEntry,
  DictionaryWordStatKey,
  getFileObjectPath,
  maxConfidence,
  prepareNewPronunciation,
  resolveStatIncrease,
  updateStatistics,
  upsertEntry,
} from "@/src/lib/data";
import { logError } from "@/src/lib/log";
import SubMenuTopNav, {
  SubMenuActions,
} from "@/src/lib/components/sub-menu-top-nav";
import useBackHandler from "@/src/lib/hooks/use-back-handler";
import PronunciationEditor from "./pronunciation-editor";
import { useAudioPlayer } from "expo-audio";
import { stripProtocol } from "@/src/lib/path";
import { RelationsEditorData, RelationsEditor } from "./relations-editor";
import ConfidenceStrip from "./confidence-strip";

import Cat from "@/assets/svgs/Definition-Editor.svg";
import CatInteraction from "@/src/lib/components/cat-interaction";

type Props = {
  lowerCaseWord?: string;
  setLowerCaseWord: (word: string) => void;
  entryId?: number;
  setEntryId: (id: number) => void;
  generatedExample?: string;
};

export default function EntryEditor(props: Props) {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary,
  );

  const [entryLoaded, entry] = useWordEntry(
    activeDictionary,
    props.lowerCaseWord,
    props.entryId,
  );

  const [saving, setSaving] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  // defaults
  const defaultSpelling = entry?.spelling ?? props.lowerCaseWord ?? "";
  const defaultPronunciationUri =
    getFileObjectPath(entry?.pronunciationAudio) ?? null;
  const defaultConfidence = entry?.confidence ?? 0;
  const defaultPartOfSpeech = entry?.partOfSpeech ?? null;
  const defaultDefinition = entry?.definition ?? "";
  const storedExample = entry?.example ?? "";
  const defaultExample = props.generatedExample ?? storedExample;
  const defaultNotes = entry?.notes ?? "";

  // state
  const [spelling, setSpelling] = useState(defaultSpelling);
  const [pronunciationUri, setPronunciationUri] = useState(
    defaultPronunciationUri,
  );
  const [confidence, setConfidence] = useState(defaultConfidence);
  const [partOfSpeech, setPartOfSpeech] = useState(defaultPartOfSpeech);
  const [definition, setDefinition] = useState(defaultDefinition);
  const [example, setExample] = useState(defaultExample);
  const [notes, setNotes] = useState(defaultNotes);
  const [relationsEditorData] = useState(() => new RelationsEditorData(entry));
  const relationsEdited = useSignalValue(relationsEditorData.modified);

  useEffect(() => {
    if (entry) {
      setSpelling(entry.spelling);
      setPronunciationUri(getFileObjectPath(entry.pronunciationAudio) ?? null);
      setConfidence(entry.confidence);
      setPartOfSpeech(entry.partOfSpeech ?? null);
      setDefinition(entry.definition);
      setExample(entry.example);
      setNotes(entry.notes);
      // uncomment and adjust if we can ever transition from one definition editor to another
      // setRelationsEditorData(new RelationsEditorData(definitionData));
    }
  }, [entry]);

  // detecting pending changes
  const hasPendingChanges =
    spelling != defaultSpelling ||
    confidence != defaultConfidence ||
    partOfSpeech != defaultPartOfSpeech ||
    definition != defaultDefinition ||
    example != defaultExample ||
    notes != defaultNotes ||
    pronunciationUri != defaultPronunciationUri ||
    relationsEdited;

  useBackHandler(() => {
    if (hasPendingChanges) {
      setDiscardDialogOpen(true);
      return true;
    }
  }, [hasPendingChanges]);

  const save = async () => {
    setSaving(true);

    try {
      const lowerCaseSpelling = spelling.toLowerCase().trim();
      const migratingWords =
        props.lowerCaseWord != lowerCaseSpelling && props.entryId != undefined;

      // handle pronunciation files
      const preparedPronunciation = await prepareNewPronunciation(
        entry,
        pronunciationUri,
      );

      // create or update the word
      const entryId = await upsertEntry(activeDictionary, {
        // coercion to force interpretation as a full "insert"
        // making all required fields required
        id: props.entryId!,
        spelling: spelling.trim(),
        pronunciationAudio: preparedPronunciation.pronunciationAudio,
        partOfSpeech,
        definition,
        example,
        notes,
        confidence,
      });

      if (entryId == null) {
        throw new Error("Failed to save definition");
      }

      // finalize pronunciation
      preparedPronunciation.finalize();

      // update statistics
      const newDefinition = props.entryId == undefined;
      const statChanges: [DictionaryWordStatKey, number][] = [
        ["definitions", newDefinition ? 1 : 0],
        [
          "documentedMaxConfidence",
          resolveStatIncrease(
            confidence == maxConfidence,
            defaultConfidence == maxConfidence,
          ),
        ],
        [
          "totalExamples",
          resolveStatIncrease(example != "", storedExample != ""),
        ],
        [
          "totalPronounced",
          resolveStatIncrease(
            preparedPronunciation.pronunciationAudio != undefined,
            defaultPronunciationUri != undefined,
          ),
        ],
      ];

      userDataSignal.set(
        updateStatistics(userDataSignal.get(), (stats) => {
          for (const [statKey, increase] of statChanges) {
            stats[statKey] = Math.max((stats[statKey] ?? 0) + increase, 0);
          }
        }),
      );

      // keep identifiers in sync
      props.setLowerCaseWord(lowerCaseSpelling);
      props.setEntryId(entryId);

      // save relations
      await relationsEditorData.save({
        id: entryId,
        spelling: spelling.trim(),
      });

      // invalidate the old word
      if (migratingWords && props.lowerCaseWord != undefined) {
        invalidateWordEntries(activeDictionary, props.lowerCaseWord);
      }

      // invalidate the new word
      invalidateWordEntries(activeDictionary, lowerCaseSpelling);
    } catch (e) {
      logError(e);
    }

    setSaving(false);
  };

  const audioPlayer = useAudioPlayer(stripProtocol(pronunciationUri));

  const saveDisabled =
    deleteRequested ||
    saving ||
    !entryLoaded ||
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
          {props.entryId != undefined && (
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

      <ScrollView contentContainerStyle={styles.scrollViewContentContainer}>
        <View style={styles.row}>
          <CustomTextInput
            style={[styles.input, styles.word]}
            placeholder={t("spelling_placeholder")}
            value={spelling}
            onChangeText={setSpelling}
          />

          <View style={styles.pronunciationGroup}>
            <PronunciationEditor
              saved={!saving}
              pronunciationUri={
                getFileObjectPath(entry?.pronunciationAudio) ?? null
              }
              setPronunciationUri={(uri) => {
                if (uri != pronunciationUri) {
                  setPronunciationUri(uri);
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

          <ConfidenceStrip
            style={styles.confidenceStrip}
            confidence={confidence}
            setConfidence={setConfidence}
          />
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
            minHeight={92}
            placeholder={t("definition_placeholder")}
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
            minHeight={92}
            placeholder={t("example_placeholder")}
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
            minHeight={92}
            placeholder={t("notes_placeholder")}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View style={theme.styles.separator} />

        <View style={styles.row}>
          <WordRelationIcon
            style={styles.iconLabel}
            color={theme.colors.iconButton}
            size={32}
          />

          <RelationsEditor style={styles.input} data={relationsEditorData} />
        </View>

        <CatInteraction style={styles.cat}>
          <Cat width={128} height={128} />
        </CatInteraction>
      </ScrollView>

      <ConfirmationDialog
        open={deleteRequested}
        title={t("Delete_Title", { name: t("Definition") })}
        description={t("Delete_Definition_Desc")}
        confirmationText={t("Confirm")}
        onCancel={() => setDeleteRequested(false)}
        onConfirm={async () => {
          if (props.lowerCaseWord != undefined && props.entryId != undefined) {
            await deleteEntry(props.entryId).catch(logError);
            invalidateWordEntries(activeDictionary, props.lowerCaseWord);

            // update statistics
            userDataSignal.set(
              updateStatistics(userDataSignal.get(), (stats) => {
                if (stats.definitions != undefined) {
                  stats.definitions = Math.max(stats.definitions - 1, 0);
                }

                if (
                  entry?.example != undefined &&
                  stats.totalExamples != undefined
                ) {
                  stats.totalExamples = Math.max(stats.totalExamples - 1, 0);
                }

                if (
                  entry?.pronunciationAudio != undefined &&
                  stats.totalPronounced != undefined
                ) {
                  stats.totalPronounced = Math.max(
                    stats.totalPronounced - 1,
                    0,
                  );
                }
              }),
            );
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
  scrollViewContentContainer: {
    flexGrow: 1,
  },
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
  confidenceStrip: {
    marginLeft: "auto",
    alignContent: "stretch",
    paddingRight: 4,
  },
  cat: {
    marginLeft: "auto",
    marginTop: "auto",
  },
});
