import React, { useState } from "react";
import SubMenuTopNav, {
  SubMenuBackButton,
  SubMenuTitle,
} from "@/lib/components/sub-menu-top-nav";
import { Span } from "@/lib/components/text";
import { useTheme } from "@/lib/contexts/theme";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import ListPopup from "@/lib/components/list-popup";
import { useUserDataContext } from "@/lib/contexts/user-data";
import {
  DictionaryData,
  exportData,
  importData,
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
import {
  bumpDictionaryVersion,
  invalidateWordDefinitions,
} from "@/lib/hooks/use-word-definitions";

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

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const [userData, setUserData] = useUserDataContext();
  const [longTaskName, setLongTaskName] = useState("");
  const [longTaskOpen, setLongTaskOpen] = useState(false);
  const [longTaskCompletedMessage, setLongTaskCompletedMessage] = useState<
    string | undefined
  >();

  const pageList = pages.map((page) => page.label);

  return (
    <>
      <SubMenuTopNav>
        <SubMenuBackButton />
        <SubMenuTitle>{t("Settings")}</SubMenuTitle>
      </SubMenuTopNav>

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
            setUserData(updatedData);
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
            setUserData(updatedData);
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
            setUserData(updatedData);
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
        onPress={() => {
          DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false })
            .then((result) => {
              if (result.canceled) {
                return;
              }

              const asset = result.assets[0];

              setLongTaskOpen(true);
              setLongTaskName(t("Importing"));
              setLongTaskCompletedMessage(undefined);

              importData(
                userData,
                (userData) => {
                  setUserData(userData);
                  bumpDictionaryVersion();
                },
                asset.uri
              )
                .then(() =>
                  setLongTaskCompletedMessage(t("Success_exclamation"))
                )
                .catch((err) => {
                  setLongTaskCompletedMessage(t("An_error_occurred"));
                  logError(err);
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
          setLongTaskName(t("Exporting"));
          setLongTaskCompletedMessage(undefined);

          exportData(userData, value?.id)
            .then(() => setLongTaskCompletedMessage(t("Success_exclamation")))
            .catch((err) => {
              setLongTaskCompletedMessage(t("An_error_occurred"));
              logError(err);
            });
        }}
      >
        <Span style={styles.label}>{t("Export_Dictionaries")}</Span>
      </ListPopup>

      <View style={theme.styles.separator} />

      <Span style={[styles.sectionHeader, theme.styles.poppingText]}>
        {t("Development")}
      </Span>

      <Pressable
        style={styles.row}
        android_ripple={theme.ripples.transparentButton}
        onPress={() => router.navigate("/attribution")}
      >
        <Span style={styles.label}>{t("Third_Party_Licenses")}</Span>
      </Pressable>

      <View style={theme.styles.separator} />

      <Pressable
        style={styles.row}
        android_ripple={theme.ripples.transparentButton}
        onPress={() => router.navigate("/logs")}
      >
        <Span style={styles.label}>{t("View_Logs")}</Span>
      </Pressable>

      <View style={theme.styles.separator} />

      <Dialog
        open={longTaskOpen}
        onClose={
          longTaskCompletedMessage != undefined
            ? () => setLongTaskOpen(false)
            : undefined
        }
      >
        <DialogTitle>{longTaskName}</DialogTitle>

        {longTaskCompletedMessage == undefined ? (
          <DialogProgressBar />
        ) : (
          <>
            <DialogDescription>{longTaskCompletedMessage}</DialogDescription>

            <ConfirmationDialogActions>
              <ConfirmationDialogAction onPress={() => setLongTaskOpen(false)}>
                {t("Close")}
              </ConfirmationDialogAction>
            </ConfirmationDialogActions>
          </>
        )}
      </Dialog>
    </>
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
