import { useState } from "react";
import SubMenuTopNav, {
  SubMenuBackButton,
  SubMenuTitle,
} from "@/src/lib/components/sub-menu-top-nav";
import { Span } from "@/src/lib/components/text";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, ScrollView, StyleSheet } from "react-native";
import ListPopup from "@/src/lib/components/list-popup";
import { useUserDataSignal } from "@/src/lib/contexts/user-data-context";
import { upsertEntry, UserData, wordOrderOptions } from "@/src/lib/data";
import { TFunction } from "i18next";
import { pages } from "./index";
import { logError } from "@/src/lib/log";
import Dialog, {
  DialogDescription,
  DialogProgressBar,
  DialogTitle,
} from "@/src/lib/components/dialog";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "@/src/lib/components/confirmation-dialog";
import RouteRoot from "@/src/lib/components/route-root";
import { Signal, useSignalValue } from "@/src/lib/hooks/use-signal";
import {
  NavigationBarSpacer,
  NavigationBarUnderlay,
} from "@/src/lib/components/system-bar-spacers";
import IntegrationTestsDialog from "@/src/lib/components/dev-tools/integration-tests-dialog";
import ExportPopup from "../lib/components/settings/export";
import ImportPopup from "../lib/components/settings/import";
import { Theme } from "../lib/themes";
import * as Icons from "../lib/components/icons";

type LongTaskMeta = {
  open: boolean;
  name: string;
  completedSignal: Signal<boolean>;
  messageSignal: Signal<string>;
  progressSignal: Signal<undefined | number>;
};

function getColorSchemeText(
  t: TFunction<"translation", undefined>,
  value?: UserData["colorScheme"],
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
  callback: (...args: T) => void,
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

type SettingsButtonContentsProps = {
  theme: Theme;
  icon: React.ComponentType<Icons.IconProps>;
  label: string;
  valueLabel?: string;
};

function SettingsButtonContents({
  theme,
  icon: Icon,
  label,
  valueLabel,
}: SettingsButtonContentsProps) {
  return (
    <>
      <Icon size={24} color={theme.colors.iconButton} />
      <Span style={styles.label}>{label}</Span>
      {valueLabel != null && (
        <Span style={[styles.value, theme.styles.disabledText]}>
          {valueLabel}
        </Span>
      )}
    </>
  );
}

function SettingsButton({
  theme,
  onPress,
  ...contentProps
}: {
  onPress: () => void;
} & SettingsButtonContentsProps) {
  return (
    <Pressable
      style={styles.row}
      android_ripple={theme.ripples.transparentButton}
      pointerEvents="box-only"
      onPress={onPress}
    >
      <SettingsButtonContents theme={theme} {...contentProps} />
    </Pressable>
  );
}

const pageList = pages.map((page) => page.label);

function CustomizationSection() {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const userData = useSignalValue(userDataSignal);

  let themeIcon = Icons.AutoThemeIcon;

  if (userData.colorScheme == "dark") {
    themeIcon = Icons.DarkThemeIcon;
  } else if (userData.colorScheme == "light") {
    themeIcon = Icons.LightThemeIcon;
  }

  return (
    <>
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
        <SettingsButtonContents
          theme={theme}
          icon={Icons.HomeIcon}
          label={t("Default_View")}
          valueLabel={
            userData.home != undefined && pageList.includes(userData.home)
              ? t(userData.home)
              : t("Dictionary")
          }
        />
      </ListPopup>

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
        <SettingsButtonContents
          theme={theme}
          icon={themeIcon}
          label={t("Theme")}
          valueLabel={getColorSchemeText(t, userData.colorScheme)}
        />
      </ListPopup>
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

  const onBegin = (title: string) => {
    longTaskSignal.set({
      ...longTaskSignal.get(),
      open: true,
      name: title,
    });

    const { completedSignal } = longTaskSignal.get();
    completedSignal.set(false);
  };
  const onProgress = throttle(progressThrottleMs, (message, progress) => {
    const { messageSignal, progressSignal } = longTaskSignal.get();
    messageSignal.set(message);
    progressSignal.set(progress);
  });
  const onComplete = (message: string) => {
    const { completedSignal, messageSignal } = longTaskSignal.get();
    messageSignal.set(message);
    completedSignal.set(true);
  };

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
        <SettingsButtonContents
          theme={theme}
          icon={Icons.SortIcon}
          label={t("Default_Order")}
          valueLabel={
            userData.dictionaryOrder != undefined &&
            wordOrderOptions.includes(userData.dictionaryOrder)
              ? t(userData.dictionaryOrder)
              : t(wordOrderOptions[0])
          }
        />
      </ListPopup>

      <ImportPopup
        style={styles.row}
        onBegin={() => onBegin(t("Dictionary_Import"))}
        onProgress={onProgress}
        onComplete={onComplete}
      >
        <SettingsButtonContents
          theme={theme}
          icon={Icons.ImportIcon}
          label={t("Import_Dictionaries")}
        />
      </ImportPopup>

      <ExportPopup
        style={styles.row}
        onBegin={() => onBegin(t("Dictionary_Export"))}
        onProgress={onProgress}
        onComplete={onComplete}
      >
        <SettingsButtonContents
          theme={theme}
          icon={Icons.ExportIcon}
          label={t("Export_Dictionaries")}
        />
      </ExportPopup>
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

      <SettingsButton
        theme={theme}
        icon={Icons.RetryIcon}
        label={t("Replay_Tutorial")}
        onPress={() => {
          router.back();
          userDataSignal.set({
            ...userDataSignal.get(),
            completedTutorial: false,
          });
        }}
      />

      <SettingsButton
        theme={theme}
        icon={Icons.PrivacyPolicyIcon}
        label={t("Privacy_Policy")}
        onPress={() => {
          Linking.openURL(
            "https://arthurcose.dev/legal/language-dex/privacy-policy.html",
          ).catch(logError);
        }}
      />
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

      <SettingsButton
        icon={Icons.GitHubIcon}
        theme={theme}
        label={t("GitHub")}
        onPress={() => {
          Linking.openURL("https://github.com/arthurcose/language-dex").catch(
            logError,
          );
        }}
      />

      <>
        <SettingsButton
          icon={Icons.DonateIcon}
          theme={theme}
          label={t("Ko-fi")}
          onPress={() => {
            Linking.openURL("https://ko-fi.com/arthurcose").catch(logError);
          }}
        />
      </>

      <SettingsButton
        icon={Icons.LicenseIcon}
        theme={theme}
        label={t("Third_Party_Licenses")}
        onPress={() => router.navigate("/attribution")}
      />

      <SettingsButton
        theme={theme}
        icon={Icons.LogsIcon}
        label={t("View_Logs")}
        onPress={() => router.navigate("/dev-tools/logs")}
      />

      <SettingsButton
        theme={theme}
        icon={Icons.TablesIcon}
        label="View Tables"
        onPress={() => router.navigate("/dev-tools/table-viewer")}
      />

      {__DEV__ && (
        <>
          <IntegrationTestsDialog
            style={styles.row}
            android_ripple={theme.ripples.transparentButton}
          >
            <SettingsButtonContents
              theme={theme}
              icon={Icons.TestIcon}
              label="Integration Tests"
            />
          </IntegrationTestsDialog>

          <SettingsButton
            icon={Icons.GenerateIcon}
            theme={theme}
            label="Generate Large Dictionary"
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
                },
              );

              const longTask = async () => {
                for (let i = 0; i < totalWords; i++) {
                  const length = Math.floor(Math.random() * 20) + 2;
                  const chars = [];

                  for (let j = 0; j < length; j++) {
                    chars.push(
                      String.fromCharCode(Math.floor(Math.random() * 26) + 65),
                    );
                  }

                  const word = chars.join("");

                  await upsertEntry(dictionaryId, {
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
          />
        </>
      )}
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
      }),
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
        <HelpSection />
        <DevelopmentSection longTaskSignal={longTaskSignal} />
        <NavigationBarSpacer />
      </ScrollView>

      <NavigationBarUnderlay />

      <LongTaskDialog signal={longTaskSignal} />
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 4,
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    flex: 1,
  },
  label: {
    fontSize: 18,
  },
  value: {
    fontSize: 18,
    marginLeft: "auto",
  },
  sectionHeader: {
    marginTop: 8,
    marginLeft: 16,
  },
});
