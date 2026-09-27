import { Pressable, StyleProp, ViewStyle, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { logError } from "@/src/lib/log";
import { useTheme } from "@/src/lib/contexts/theme";
import { useUserDataSignal } from "@/src/lib/contexts/user-data";
import { UserData } from "@/src/lib/data/user";
import { Signal, useSignalValue } from "@/src/lib/hooks/use-signal";
import { bumpDictionaryVersion } from "@/src/lib/hooks/use-word-definitions";
import { DictionaryData, importCsv, importData } from "@/src/lib/data";
import { TFunction } from "i18next";

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

function csvImport(
  t: TFunction<"translation", undefined>,
  uri: string,
  dictionary: DictionaryData,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
) {
  wrapImportPromise(
    t,
    onComplete,
    importCsv(uri, dictionary, (i, total) =>
      onProgress(t("importing_words_stage"), i / total),
    ),
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

              const userData = userDataSignal.get();
              const dictionary = userData.dictionaries.find(
                (d) => d.id == userData.activeDictionary,
              )!;

              onBegin();

              if (
                asset.mimeType == "text/csv" ||
                asset.mimeType == "text/comma-separated-values"
              ) {
                csvImport(t, asset.uri, dictionary, onProgress, onComplete);
              } else {
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
    </>
  );
}

const styles = StyleSheet.create({
  rowLabel: {
    flex: 1,
  },
  rowOptions: {
    height: "100%",
    flexDirection: "row",
    width: 48 * 3.5,
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowStyle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingLeft: 16,
  },
});
