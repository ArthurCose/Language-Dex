import React from "react";
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
import { UserData } from "@/lib/data";
import { TFunction } from "i18next";
import { pages } from "./index";

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
          if (value != userData.colorScheme) {
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

      <Pressable
        style={styles.row}
        android_ripple={theme.ripples.transparentButton}
        onPress={() => router.navigate("/attribution")}
      >
        <Span style={styles.label}>{t("Third_Party_Licenses")}</Span>
      </Pressable>

      <View style={theme.styles.separator} />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    padding: 16,
  },
  label: {
    fontSize: 20,
  },
  value: {
    fontSize: 20,
    marginLeft: "auto",
  },
});
