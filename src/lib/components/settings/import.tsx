import { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Pressable,
  StyleProp,
  TextInput,
  ViewStyle,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { logError } from "@/src/lib/log";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { useUserDataSignal } from "@/src/lib/contexts/user-data-context";
import { UserData } from "@/src/lib/data/user";
import { Signal, useSignal, useSignalValue } from "@/src/lib/hooks/use-signal";
import { bumpDictionaryVersion } from "@/src/lib/hooks/use-word-definitions";
import { DictionaryData, importCsv, importData } from "@/src/lib/data";
import Dialog, { DialogTitle } from "@/src/lib/components/dialog";
import { Span } from "@/src/lib/components/text";
import { SignalledTextInput } from "@/src/lib/components/custom-text-input";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "@/src/lib/components/confirmation-dialog";
import { RadioItem } from "@/src/lib/components/radio-button";

type ProgressCallback = (message: string, progress?: number) => void;
type CompleteCallback = (message: string) => void;

type Props = {
  style?: StyleProp<ViewStyle>;
  onBegin: () => void;
  onProgress: ProgressCallback;
  onComplete: CompleteCallback;
} & React.PropsWithChildren;

function wrapImportPromise(
  t: TFunction<"translation", undefined>,
  onComplete: CompleteCallback,
  promise: Promise<void>,
) {
  promise
    .then(() => onComplete(t("Success_exclamation")))
    .catch((err) => {
      logError(err);
      onComplete(t("An_error_occurred"));
    })
    .finally(() => {
      bumpDictionaryVersion();
    });
}

function sqliteImport(
  t: TFunction<"translation", undefined>,
  uri: string,
  userDataSignal: Signal<UserData>,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
) {
  const userData = userDataSignal.get();
  const saveUserData = (data: UserData) => userDataSignal.set(data);

  wrapImportPromise(
    t,
    onComplete,
    importData(userData, saveUserData, uri, (stage, i, total) =>
      onProgress(t("importing_" + stage + "_stage"), i / total),
    ),
  );
}

function csvImport({
  t,
  uri,
  dictionary,
  skipFields,
  userDataSignal,
  onProgress,
  onComplete,
}: {
  t: TFunction<"translation", undefined>;
  uri: string;
  dictionary: DictionaryData;
  skipFields?: string[];
  userDataSignal: Signal<UserData>;
  onProgress: ProgressCallback;
  onComplete: CompleteCallback;
}) {
  const userData = userDataSignal.get();
  const saveUserData = (data: UserData) => userDataSignal.set(data);

  wrapImportPromise(
    t,
    onComplete,
    importCsv({
      uri,
      dictionary,
      skipFields,
      userData,
      saveUserData,
      progressCallback: (i, total) =>
        onProgress(t("importing_words_stage"), i / total),
    }),
  );
}

type ResolveDictionary = (
  dictionary?: DictionaryData,
  skipFields?: string[],
) => void;

function ImportDestinationDialog({
  resolveDictionarySignal,
}: {
  resolveDictionarySignal: Signal<ResolveDictionary | null>;
}) {
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const userData = useSignalValue(userDataSignal);
  const nameInputRef = useRef<TextInput | null>(null);

  const resolveDictionary = useSignalValue(resolveDictionarySignal);
  const [radioGroupValue, setRadioGroupValue] = useState(
    () => "d-" + userData.activeDictionary,
  );
  const newDictionaryNameSignal = useSignal("");

  useEffect(() => {
    if (resolveDictionary) {
      // reset when reopening
      newDictionaryNameSignal.set("");
      setRadioGroupValue("d-" + userDataSignal.get().activeDictionary);
    }
  }, [resolveDictionary]);

  const cancel = () => {
    if (resolveDictionary) {
      resolveDictionary();
      resolveDictionarySignal.set(null);
    }
  };

  const confirm = () => {
    if (!resolveDictionary) {
      return;
    }

    if (radioGroupValue.startsWith("d-")) {
      const id = parseInt(radioGroupValue.slice(2));
      const dictionary = userData.dictionaries.find((d) => d.id == id)!;
      resolveDictionary(dictionary);
    } else {
      // create a new dictionary
      const userData = { ...userDataSignal.get() };

      const newDictionaryName = newDictionaryNameSignal.get();
      const name =
        newDictionaryName.length > 0 ? newDictionaryName : t("New_Dictionary");

      const newDictionary = {
        name,
        id: userData.nextDictionaryId++,
        partsOfSpeech: [],
        nextPartOfSpeechId: 0,
        stats: {},
      };

      userData.dictionaries = [...userData.dictionaries, newDictionary];
      userDataSignal.set(userData);

      resolveDictionary(newDictionary);
    }

    resolveDictionarySignal.set(null);
  };

  return (
    <Dialog open={resolveDictionary != null} onClose={cancel}>
      <DialogTitle>{t("Import_Destination_Title")}</DialogTitle>

      <ScrollView>
        {userData.dictionaries.map((dictionary) => (
          <RadioItem
            key={dictionary.id}
            groupValue={radioGroupValue}
            value={"d-" + dictionary.id}
            onChange={setRadioGroupValue}
          >
            <Span>{dictionary.name}</Span>
          </RadioItem>
        ))}

        <RadioItem
          groupValue={radioGroupValue}
          value="new"
          pointerEvents={radioGroupValue == "new" ? "box-none" : undefined}
          onChange={setRadioGroupValue}
          onPress={() => nameInputRef.current?.focus()}
        >
          <SignalledTextInput
            style={styles.dictionaryNameInput}
            inputRef={nameInputRef}
            placeholder={t("New_Dictionary")}
            signal={newDictionaryNameSignal}
          />
        </RadioItem>
      </ScrollView>

      <ConfirmationDialogActions>
        <ConfirmationDialogAction onPress={cancel}>
          {t("Cancel")}
        </ConfirmationDialogAction>

        <ConfirmationDialogAction onPress={confirm}>
          {t("Confirm")}
        </ConfirmationDialogAction>
      </ConfirmationDialogActions>
    </Dialog>
  );
}

export default function ImportPopup({
  style,
  onBegin,
  onProgress,
  onComplete,
  children,
}: Props) {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();

  const resolveDictionarySignal = useSignal<ResolveDictionary | null>(null);

  return (
    <>
      <Pressable
        style={style}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
        onPress={() => {
          DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: false,
          })
            .then((result) => {
              if (result.canceled) {
                return;
              }

              const asset = result.assets[0];

              if (
                asset.mimeType == "text/csv" ||
                asset.mimeType == "text/comma-separated-values"
              ) {
                resolveDictionarySignal.set((dictionary, skipFields) => {
                  if (!dictionary) {
                    // no dictionary chosen, cancel
                    return;
                  }

                  onBegin();
                  csvImport({
                    t,
                    uri: asset.uri,
                    dictionary,
                    skipFields,
                    userDataSignal,
                    onProgress,
                    onComplete,
                  });
                });
              } else {
                onBegin();
                sqliteImport(
                  t,
                  asset.uri,
                  userDataSignal,
                  onProgress,
                  onComplete,
                );
              }
            })
            .catch(logError);
        }}
      >
        {children}
      </Pressable>

      <ImportDestinationDialog
        resolveDictionarySignal={resolveDictionarySignal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  dictionaryNameInput: {
    flex: 1,
    padding: 0,
    fontSize: 16,
  },
});
