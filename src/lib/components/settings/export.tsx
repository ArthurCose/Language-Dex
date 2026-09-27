import { useState } from "react";
import {
  Pressable,
  StyleProp,
  View,
  ViewStyle,
  VirtualizedList,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as Sharing from "expo-sharing";
import { logError } from "@/src/lib/log";
import { useTheme } from "@/src/lib/contexts/theme";
import { useUserDataSignal } from "@/src/lib/contexts/user-data";
import { UserData } from "@/src/lib/data/user";
import { useSignalLens, useSignalValue } from "@/src/lib/hooks/use-signal";
import Dialog from "@/src/lib/components/dialog";
import { Span } from "@/src/lib/components/text";
import {
  csvColumns,
  DictionaryData,
  exportCsv,
  exportData,
} from "@/src/lib/data";
import { TFunction } from "i18next";

type ProgressCallback = (message: string, progress?: number) => void;
type CompleteCallback = (message: string) => void;

type Props = {
  style?: StyleProp<ViewStyle>;
  onBegin: () => void;
  onProgress: ProgressCallback;
  onComplete: CompleteCallback;
} & React.PropsWithChildren;

function wrapExportPromise(
  t: TFunction<"translation", undefined>,
  onComplete: CompleteCallback,
  promise: Promise<string>,
) {
  promise
    .then((uri) => Sharing.shareAsync(uri))
    .then(() => onComplete(t("Success_exclamation")))
    .catch((err) => {
      logError(err);
      onComplete(t("An_error_occurred"));
    });
}

function sqliteExport(
  t: TFunction<"translation", undefined>,
  userData: UserData,
  dictionaryId: number | undefined,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
) {
  onProgress(t("exporting_metadata_stage"));

  wrapExportPromise(
    t,
    onComplete,
    exportData(userData, dictionaryId, (stage, i, total) =>
      onProgress(t("exporting_" + stage + "_stage"), i / total),
    ),
  );
}

function csvExport(
  t: TFunction<"translation", undefined>,
  dictionary: DictionaryData,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
) {
  onProgress(t("exporting_metadata_stage"));

  wrapExportPromise(
    t,
    onComplete,
    exportCsv(t, csvColumns, dictionary, (i, total) =>
      onProgress(t("exporting_words_stage"), i / total),
    ),
  );
}

export default function ExportPopup({
  style,
  onBegin,
  onProgress,
  onComplete,
  children,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const userData = useSignalValue(userDataSignal);
  const dictionaries = useSignalLens(userDataSignal, (userData) =>
    userData.dictionaries.map((d) => d),
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={style}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
      >
        {children}
      </Pressable>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <VirtualizedList
          ListHeaderComponent={
            <View style={styles.rowStyle}>
              <Span style={styles.rowLabel}>{t("All")}</Span>

              <View style={theme.styles.verticalSeparator} />

              <View style={styles.rowOptions}>
                <Pressable
                  style={styles.option}
                  android_ripple={theme.ripples.transparentButton}
                  pointerEvents="box-only"
                  onPress={() => {
                    setOpen(false);
                    onBegin();
                    sqliteExport(
                      t,
                      userData,
                      undefined,
                      onProgress,
                      onComplete,
                    );
                  }}
                >
                  <Span>{t("DB")}</Span>
                </Pressable>
              </View>
            </View>
          }
          data={dictionaries}
          getItem={(_, i) => dictionaries[i]}
          getItemCount={() => dictionaries.length}
          keyExtractor={(d) => d.id.toString()}
          renderItem={({ item: dictionary }) => (
            <View style={styles.rowStyle}>
              <Span style={styles.rowLabel}>{dictionary.name}</Span>

              <View style={theme.styles.verticalSeparator} />

              <View>
                <View style={theme.styles.separator} />
                <View style={styles.rowOptions}>
                  <Pressable
                    style={styles.option}
                    android_ripple={theme.ripples.transparentButton}
                    pointerEvents="box-only"
                    onPress={() => {
                      setOpen(false);
                      onBegin();
                      sqliteExport(
                        t,
                        userData,
                        dictionary.id,
                        onProgress,
                        onComplete,
                      );
                    }}
                  >
                    <Span>{t("DB")}</Span>
                  </Pressable>

                  <View style={theme.styles.verticalSeparator} />

                  <Pressable
                    style={styles.option}
                    android_ripple={theme.ripples.transparentButton}
                    pointerEvents="box-only"
                    onPress={() => {
                      setOpen(false);
                      onBegin();
                      csvExport(t, dictionary, onProgress, onComplete);
                    }}
                  >
                    <Span>{t("CSV")}</Span>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      </Dialog>
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
