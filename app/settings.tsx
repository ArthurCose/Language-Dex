import React, { useState } from "react";
import SubMenuTopNav, {
  SubMenuBackButton,
  SubMenuTitle,
} from "@/lib/components/sub-menu-top-nav";
import { Span } from "@/lib/components/text";
import { useTheme } from "@/lib/contexts/theme";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import ListPopup from "@/lib/components/list-popup";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import {
  DictionaryData,
  exportData,
  importData,
  upsertDefinition,
  UserData,
  wordOrderOptions,
} from "@/lib/data";
import { TFunction } from "i18next";
import { pages } from "./index";
import { logError } from "@/lib/log";
import Dialog, {
  DialogDescription,
  DialogProgressBar,
  DialogTitle,
} from "@/lib/components/dialog";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "@/lib/components/confirmation-dialog";
import * as DocumentPicker from "expo-document-picker";
import { bumpDictionaryVersion } from "@/lib/hooks/use-word-definitions";
import RouteRoot from "@/lib/components/route-root";
import { requestAdRemoval } from "@/lib/in-app-purchases";
import {
  isPrivacyOptionsFormRequired,
  showPrivacyOptionsForm,
} from "@/lib/components/ads";
import { useSignal, useSignalValue } from "@/lib/hooks/use-signal";

function getColorSchemeText(
  t: TFunction<"translation", undefined>,
  value?: UserData["colorScheme"]
) {
  if (value == "light") {
    return t("Light");
  } else if (value == "dark") {
    return t("Dark");
  } else {
    return t("System");
  }
}

const progressThrottleMs = 1000 / 60;

function throttle<T extends any[]>(
  ms: number,
  callback: (...args: T) => void
): (...args: T) => void {
  let lastCall = 0;

  return (...params) => {
    const now = performance.now();

    if (now - lastCall > ms) {
      lastCall = now;
      callback(...params);
    }
  };
}

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const userData = useSignalValue(userDataSignal);
  const [longTaskName, setLongTaskName] = useState("");
  const [longTaskOpen, setLongTaskOpen] = useState(false);
  const [longTaskMessage, setLongTaskMessage] = useState("");
  const longTaskProgressSignal = useSignal<number | undefined>(undefined);
  const [longTaskCompleted, setLongTaskCompleted] = useState(false);

  const pageList = pages.map((page) => page.label);

  return (
    <RouteRoot>
      <SubMenuTopNav>
        <SubMenuBackButton />
        <SubMenuTitle>{t("Settings")}</SubMenuTitle>
      </SubMenuTopNav>

      <ScrollView>
        <ListPopup
          style={styles.row}
          list={["light", "dark"]}
          getItemText={(value) => getColorSchemeText(t, value)}
          defaultItemText={t("System")}
          keyExtractor={(value) => value}
          onSelect={(value?: UserData["colorScheme"]) => {
            if (value != userData.colorScheme) {
              const updatedData = { ...userData };
              updatedData.colorScheme = value;
              userDataSignal.set(updatedData);
            }
          }}
        >
          <Span style={styles.label}>{t("Theme")}</Span>
          <Span style={[styles.value, theme.styles.disabledText]}>
            {getColorSchemeText(t, userData.colorScheme)}
          </Span>
        </ListPopup>

        <View style={theme.styles.separator} />

        <ListPopup
          style={styles.row}
          list={pageList}
          getItemText={(value) => t(value)}
          keyExtractor={(value) => value}
          onSelect={(value?: string) => {
            if (value != userData.home) {
              const updatedData = { ...userData };
              updatedData.home = value;
              userDataSignal.set(updatedData);
            }
          }}
        >
          <Span style={styles.label}>{t("Default_View")}</Span>
          <Span style={[styles.value, theme.styles.disabledText]}>
            {userData.home != undefined && pageList.includes(userData.home)
              ? t(userData.home)
              : t("Dictionary")}
          </Span>
        </ListPopup>

        <View style={theme.styles.separator} />

        <Span style={[styles.sectionHeader, theme.styles.poppingText]}>
          {t("Dictionaries")}
        </Span>

        <ListPopup
          style={styles.row}
          list={wordOrderOptions}
          getItemText={(value) => t(value)}
          keyExtractor={(value) => value}
          onSelect={(value) => {
            if (value != userData.dictionaryOrder) {
              const updatedData = { ...userData };
              updatedData.dictionaryOrder = value;
              userDataSignal.set(updatedData);
            }
          }}
        >
          <Span style={styles.label}>{t("Default_Order")}</Span>
          <Span style={[styles.value, theme.styles.disabledText]}>
            {userData.dictionaryOrder != undefined &&
            wordOrderOptions.includes(userData.dictionaryOrder)
              ? t(userData.dictionaryOrder)
              : t(wordOrderOptions[0])}
          </Span>
        </ListPopup>

        <View style={theme.styles.separator} />

        <Pressable
          style={styles.row}
          android_ripple={theme.ripples.transparentButton}
          pointerEvents="box-only"
          onPress={() => {
            DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false })
              .then((result) => {
                if (result.canceled) {
                  return;
                }

                const asset = result.assets[0];

                setLongTaskOpen(true);
                setLongTaskName(t("Dictionary_Import"));
                setLongTaskCompleted(false);
                setLongTaskMessage(t("importing_metadata_stage"));
                longTaskProgressSignal.set(undefined);

                const progressCallback = throttle(
                  progressThrottleMs,
                  (stage, i, total) => {
                    setLongTaskMessage(t("importing_" + stage + "_stage"));
                    longTaskProgressSignal.set(i / total);
                  }
                );

                importData(
                  userData,
                  (userData) => {
                    userDataSignal.set(userData);
                  },
                  asset.uri,
                  progressCallback
                )
                  .then(() => setLongTaskMessage(t("Success_exclamation")))
                  .catch((err) => {
                    setLongTaskMessage(t("An_error_occurred"));
                    logError(err);
                  })
                  .finally(() => {
                    setLongTaskCompleted(true);
                    bumpDictionaryVersion();
                  });
              })
              .catch(logError);
          }}
        >
          <Span style={styles.label}>{t("Import_Dictionaries")}</Span>
        </Pressable>

        <View style={theme.styles.separator} />

        <ListPopup
          style={styles.row}
          list={userData.dictionaries.map((d) => d)}
          getItemText={(value) => value.name}
          keyExtractor={(value) => String(value.id)}
          defaultItemText={t("All")}
          onSelect={(value?: DictionaryData) => {
            setLongTaskOpen(true);
            setLongTaskName(t("Dictionary_Export"));
            setLongTaskCompleted(false);
            setLongTaskMessage(t("exporting_metadata_stage"));
            longTaskProgressSignal.set(undefined);

            const progressCallback = throttle(
              progressThrottleMs,
              (stage, i, total) => {
                setLongTaskMessage(t("exporting_" + stage + "_stage"));
                longTaskProgressSignal.set(i / total);
              }
            );

            exportData(userData, value?.id, progressCallback)
              .then(() => {
                setLongTaskMessage(t("Success_exclamation"));
              })
              .catch((err) => {
                setLongTaskMessage(t("An_error_occurred"));
                logError(err);
              })
              .finally(() => {
                setLongTaskCompleted(true);
              });
          }}
        >
          <Span style={styles.label}>{t("Export_Dictionaries")}</Span>
        </ListPopup>

        <View style={theme.styles.separator} />

        {/* <Span style={[styles.sectionHeader, theme.styles.poppingText]}>
        {t("Ads")}
      </Span>

      <Pressable
        style={styles.row}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
        onPress={requestAdRemoval}
        disabled={userData.removeAds}
      >
        <Span
          style={[
            styles.label,
            userData.removeAds && theme.styles.disabledText,
          ]}
        >
          {userData.removeAds ? t("Removed_Ads") : t("Remove_Ads")}
        </Span>

        {userData.removeAds && <Span style={styles.value}>✅</Span>}
      </Pressable>

      {isPrivacyOptionsFormRequired() && (
        <>
          <View style={theme.styles.separator} />

          <Pressable
            style={styles.row}
            android_ripple={theme.ripples.transparentButton}
            pointerEvents="box-only"
            onPress={showPrivacyOptionsForm}
          >
            <Span style={styles.label}>{t("Show_Privacy_Options")}</Span>
          </Pressable>
        </>

        <View style={theme.styles.separator} />
      )} */}

        <Span style={[styles.sectionHeader, theme.styles.poppingText]}>
          {t("Development")}
        </Span>

        <Pressable
          style={styles.row}
          android_ripple={theme.ripples.transparentButton}
          pointerEvents="box-only"
          onPress={() => router.navigate("/attribution")}
        >
          <Span style={styles.label}>{t("Third_Party_Licenses")}</Span>
        </Pressable>

        <View style={theme.styles.separator} />

        <Pressable
          style={styles.row}
          android_ripple={theme.ripples.transparentButton}
          pointerEvents="box-only"
          onPress={() => router.navigate("/logs")}
        >
          <Span style={styles.label}>{t("View_Logs")}</Span>
        </Pressable>

        {__DEV__ && (
          <>
            <View style={theme.styles.separator} />

            <Pressable
              style={styles.row}
              android_ripple={theme.ripples.transparentButton}
              pointerEvents="box-only"
              onPress={() => {
                const totalWords = 5000;

                const updatedData = { ...userData };
                updatedData.updatingStats = true;
                updatedData.dictionaries = [...updatedData.dictionaries];

                const dictionaryId = updatedData.nextDictionaryId++;

                updatedData.dictionaries.push({
                  name: "Generated",
                  id: dictionaryId,
                  partsOfSpeech: [],
                  nextPartOfSpeechId: 0,
                  stats: {
                    definitions: totalWords,
                  },
                });

                userDataSignal.set(updatedData);

                setLongTaskOpen(true);
                setLongTaskName("Generating Dictionary");
                setLongTaskMessage("Creating words...");
                longTaskProgressSignal.set(0);
                setLongTaskCompleted(false);

                const updateProgress = throttle(
                  progressThrottleMs,
                  (i: number) => {
                    longTaskProgressSignal.set(i / totalWords);
                  }
                );

                const longTask = async () => {
                  for (let i = 0; i < totalWords; i++) {
                    const length = Math.floor(Math.random() * 20) + 2;
                    const chars = [];

                    for (let j = 0; j < length; j++) {
                      chars.push(
                        String.fromCharCode(Math.floor(Math.random() * 26) + 65)
                      );
                    }

                    const word = chars.join("");

                    await upsertDefinition(dictionaryId, {
                      spelling: word,
                      confidence: 0,
                      definition: word,
                      example: "",
                      notes: "",
                    });

                    updateProgress(i);
                  }

                  setLongTaskMessage("Success");
                  setLongTaskCompleted(true);

                  userDataSignal.set({
                    ...userDataSignal.get(),
                    updatingStats: false,
                  });
                };

                longTask().catch(logError);
              }}
            >
              <Span style={styles.label}>Generate Large Dictionary</Span>
            </Pressable>
          </>
        )}

        <View style={theme.styles.separator} />
      </ScrollView>

      <Dialog
        open={longTaskOpen}
        onClose={() => {
          if (longTaskCompleted) {
            setLongTaskOpen(false);
          }
        }}
      >
        <DialogTitle>{longTaskName}</DialogTitle>

        {longTaskMessage != undefined && (
          <DialogDescription>{longTaskMessage}</DialogDescription>
        )}

        {longTaskCompleted ? (
          <ConfirmationDialogActions>
            <ConfirmationDialogAction onPress={() => setLongTaskOpen(false)}>
              {t("Close")}
            </ConfirmationDialogAction>
          </ConfirmationDialogActions>
        ) : (
          <DialogProgressBar progressSignal={longTaskProgressSignal} />
        )}
      </Dialog>
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    padding: 16,
    paddingLeft: 24,
  },
  label: {
    fontSize: 20,
  },
  value: {
    fontSize: 20,
    marginLeft: "auto",
  },
  sectionHeader: {
    marginTop: 8,
    marginLeft: 16,
  },
});
