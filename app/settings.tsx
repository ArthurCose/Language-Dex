import React, { useState } from "react";
import SubMenuTopNav, {
  SubMenuBackButton,
  SubMenuTitle,
} from "@/lib/components/sub-menu-top-nav";
import { Span } from "@/lib/components/text";
import { useTheme } from "@/lib/contexts/theme";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
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
import {
  isIapAvailable,
  requestAdRemoval,
  useCanRequestAdRemoval,
} from "@/lib/in-app-purchases";
import {
  isPrivacyOptionsFormRequired,
  showPrivacyOptionsForm,
} from "@/lib/components/ads";
import { Signal, useSignalLens, useSignalValue } from "@/lib/hooks/use-signal";
import { NavigationBarSpacer } from "@/lib/components/system-bar-spacers";

type LongTaskMeta = {
  open: boolean;
  name: string;
  completedSignal: Signal<boolean>;
  messageSignal: Signal<string>;
  progressSignal: Signal<undefined | number>;
};

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

const pageList = pages.map((page) => page.label);

function CustomizationSection() {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const userData = useSignalValue(userDataSignal);

  return (
    <>
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
    </>
  );
}

function DictionariesSection({
  longTaskSignal,
}: {
  longTaskSignal: Signal<LongTaskMeta>;
}) {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const userData = useSignalValue(userDataSignal);

  return (
    <>
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

              longTaskSignal.set({
                ...longTaskSignal.get(),
                open: true,
                name: t("Dictionary_Import"),
              });
              const { completedSignal, messageSignal, progressSignal } =
                longTaskSignal.get();
              completedSignal.set(false);
              messageSignal.set(t("importing_metadata_stage"));
              progressSignal.set(undefined);

              const progressCallback = throttle(
                progressThrottleMs,
                (stage, i, total) => {
                  if (i == 0) {
                    messageSignal.set(t("importing_" + stage + "_stage"));
                  }
                  progressSignal.set(i / total);
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
                .then(() => messageSignal.set(t("Success_exclamation")))
                .catch((err) => {
                  messageSignal.set(t("An_error_occurred"));
                  logError(err);
                })
                .finally(() => {
                  completedSignal.set(true);
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
          longTaskSignal.set({
            ...longTaskSignal.get(),
            open: true,
            name: t("Dictionary_Export"),
          });

          const { completedSignal, messageSignal, progressSignal } =
            longTaskSignal.get();
          completedSignal.set(false);
          messageSignal.set(t("exporting_metadata_stage"));
          progressSignal.set(undefined);

          const progressCallback = throttle(
            progressThrottleMs,
            (stage, i, total) => {
              if (i == 0) {
                messageSignal.set(t("exporting_" + stage + "_stage"));
              }
              progressSignal.set(i / total);
            }
          );

          exportData(userData, value?.id, progressCallback)
            .then(() => messageSignal.set(t("Success_exclamation")))
            .catch((err) => {
              messageSignal.set(t("An_error_occurred"));
              logError(err);
            })
            .finally(() => completedSignal.set(true));
        }}
      >
        <Span style={styles.label}>{t("Export_Dictionaries")}</Span>
      </ListPopup>

      <View style={theme.styles.separator} />
    </>
  );
}

function AdsSection({
  longTaskSignal,
}: {
  longTaskSignal: Signal<LongTaskMeta>;
}) {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const removedAds = useSignalLens(userDataSignal, (d) => d.removeAds);

  const canRequestAdRemoval = useCanRequestAdRemoval();

  return (
    <>
      <Span style={[styles.sectionHeader, theme.styles.poppingText]}>
        {t("Ads")}
      </Span>

      <Pressable
        style={styles.row}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
        onPress={() => {
          if (!canRequestAdRemoval) {
            const taskData = longTaskSignal.get();
            longTaskSignal.set({
              ...taskData,
              open: true,
              name: t("Requires_Internet"),
            });
            taskData.completedSignal.set(true);
            taskData.messageSignal.set(t("failed_to_fetch_product"));
            return;
          }

          requestAdRemoval().catch(logError);
        }}
        disabled={removedAds}
      >
        <Span style={[styles.label, removedAds && theme.styles.disabledText]}>
          {removedAds ? t("Removed_Ads") : t("Remove_Ads")}
        </Span>

        {removedAds && <Span style={styles.value}>✅</Span>}
      </Pressable>

      <View style={theme.styles.separator} />

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

          <View style={theme.styles.separator} />
        </>
      )}

      <Pressable
        style={styles.row}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
        onPress={() => {
          Linking.openURL(
            "https://arthurcose.dev/legal/language-dex/privacy-policy.html"
          ).catch(logError);
        }}
        disabled={removedAds}
      >
        <Span style={styles.label}>{t("Privacy_Policy")}</Span>
      </Pressable>

      <View style={theme.styles.separator} />
    </>
  );
}

function HelpSection() {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();

  return (
    <>
      <Span style={[styles.sectionHeader, theme.styles.poppingText]}>
        {t("Help")}
      </Span>

      <Pressable
        style={styles.row}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
        onPress={() => {
          router.back();
          userDataSignal.set({
            ...userDataSignal.get(),
            completedTutorial: false,
          });
        }}
      >
        <Span style={styles.label}>{t("Replay_Tutorial")}</Span>
      </Pressable>

      <View style={theme.styles.separator} />
    </>
  );
}

function DevelopmentSection({
  longTaskSignal,
}: {
  longTaskSignal: Signal<LongTaskMeta>;
}) {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();

  return (
    <>
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

              const updatedData = { ...userDataSignal.get() };
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

              longTaskSignal.set({
                ...longTaskSignal.get(),
                open: true,
                name: "Generating Dictionary",
              });

              const { completedSignal, messageSignal, progressSignal } =
                longTaskSignal.get();
              completedSignal.set(false);
              messageSignal.set("Creating words...");
              progressSignal.set(0);

              const updateProgress = throttle(
                progressThrottleMs,
                (i: number) => {
                  progressSignal.set(i / totalWords);
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

                completedSignal.set(true);
                messageSignal.set("Success");

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
    </>
  );
}

function LongTaskDialog({ signal }: { signal: Signal<LongTaskMeta> }) {
  const [t] = useTranslation();
  const taskData = useSignalValue(signal);
  const completed = useSignalValue(taskData.completedSignal);
  const message = useSignalValue(taskData.messageSignal);

  return (
    <Dialog
      open={taskData.open}
      onClose={() => {
        if (completed) {
          signal.set({ ...taskData, open: false });
        }
      }}
    >
      <DialogTitle>{taskData.name}</DialogTitle>

      {message != undefined && <DialogDescription>{message}</DialogDescription>}

      {completed ? (
        <ConfirmationDialogActions>
          <ConfirmationDialogAction
            onPress={() => signal.set({ ...taskData, open: false })}
          >
            {t("Close")}
          </ConfirmationDialogAction>
        </ConfirmationDialogActions>
      ) : (
        <DialogProgressBar progressSignal={taskData.progressSignal} />
      )}
    </Dialog>
  );
}

export default function () {
  const [t] = useTranslation();
  const [longTaskSignal] = useState(
    () =>
      new Signal({
        open: false,
        name: "",
        completedSignal: new Signal(false),
        messageSignal: new Signal(""),
        progressSignal: new Signal<undefined | number>(0),
      })
  );

  return (
    <RouteRoot allowNavigationInset>
      <SubMenuTopNav>
        <SubMenuBackButton />
        <SubMenuTitle>{t("Settings")}</SubMenuTitle>
      </SubMenuTopNav>

      <ScrollView>
        <CustomizationSection />
        <DictionariesSection longTaskSignal={longTaskSignal} />
        {isIapAvailable() && <AdsSection longTaskSignal={longTaskSignal} />}
        <HelpSection />
        <DevelopmentSection longTaskSignal={longTaskSignal} />
        <NavigationBarSpacer />
      </ScrollView>

      <LongTaskDialog signal={longTaskSignal} />
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
  valueIcon: {
    alignSelf: "center",
    marginLeft: "auto",
  },
  sectionHeader: {
    marginTop: 8,
    marginLeft: 16,
  },
});
