import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/contexts/theme";
import { router } from "expo-router";
import CustomTextInput, {
  CustomMultilineTextInput,
} from "@/lib/components/custom-text-input";
import { useTranslation } from "react-i18next";
import { StyleSheet, View, ScrollView } from "react-native";
import {
  ArrowLeftIcon,
  DefinitionIcon,
  ExampleIcon,
  NotesIcon,
  PartOfSpeechIcon,
  SaveIcon,
  TrashIcon,
} from "@/lib/components/icons";
import { SubMenuIconButton } from "@/lib/components/icon-button";
import {
  invalidateWordDefinitions,
  useWordDefinition,
} from "@/lib/hooks/use-word-definitions";
import { useUserDataContext } from "@/lib/contexts/user-data";
import PartOfSpeechDropdown from "@/lib/components/part-of-speech-dropdown";
import ConfirmationDialog, {
  DiscardDialog,
} from "@/lib/components/confirmation-dialog";
import {
  deleteDefinition,
  updateStatistics,
  upsertDefinition,
} from "@/lib/data";
import { logError } from "@/lib/log";
import SubMenuTopNav, {
  SubMenuActions,
} from "@/lib/components/sub-menu-top-nav";
import useBackHandler from "@/lib/hooks/use-back-handler";
import { usePendingChangesDetection } from "@/lib/hooks/use-pending-changes-detection";

type Props = {
  lowerCaseWord?: string;
  setLowerCaseWord: (word: string) => void;
  definitionId?: number;
  setDefinitionId: (id: number) => void;
};

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

  const [spelling, setSpelling] = useState(props.lowerCaseWord ?? "");
  const [partOfSpeech, setPartOfSpeech] = useState<number | undefined>(
    definitionData?.partOfSpeech
  );
  const [definition, setDefinition] = useState(
    definitionData?.definition ?? ""
  );
  const [example, setExample] = useState(definitionData?.example ?? "");
  const [notes, setNotes] = useState(definitionData?.notes ?? "");

  useEffect(() => {
    if (definitionData) {
      setPartOfSpeech(definitionData.partOfSpeech);
      setDefinition(definitionData.definition);
      setExample(definitionData.example);
      setNotes(definitionData.notes);
    }
  }, [definitionData]);

  // detecting pending changes
  const [hasPendingChanges, setHasPendingChanges] = usePendingChangesDetection([
    spelling,
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
      const lowerCaseSpelling = spelling.toLowerCase();
      const migratingWords =
        props.lowerCaseWord != lowerCaseSpelling &&
        props.definitionId != undefined;

      // create or update the word
      const definitionId = await upsertDefinition(
        userData.activeDictionary,
        lowerCaseSpelling,
        {
          id: props.definitionId,
          partOfSpeech,
          definition,
          example,
          notes,
          confidence: definitionData?.confidence ?? 0,
        }
      );

      // update statistics
      if (props.definitionId == undefined) {
        setUserData((userData) => {
          userData = updateStatistics(userData, (stats) => {
            stats.definitions = (stats.definitions ?? 0) + 1;
          });

          return userData;
        });
      }

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
            disabled={
              deleteRequested ||
              saving ||
              !definitionLoaded ||
              definition.trim().length == 0 ||
              spelling.length == 0 ||
              !hasPendingChanges
            }
            onPress={save}
          />
        </SubMenuActions>
      </SubMenuTopNav>

      <ScrollView>
        <CustomTextInput
          style={styles.word}
          placeholder={t("word")}
          value={spelling}
          onChangeText={setSpelling}
        />

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
    paddingTop: 3,
    paddingLeft: 16,
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
});
