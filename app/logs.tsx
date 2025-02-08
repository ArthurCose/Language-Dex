import { SubMenuIconButton } from "@/lib/components/icon-button";
import { CopyIcon, TrashIcon } from "@/lib/components/icons";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
  SubMenuTitle,
} from "@/lib/components/sub-menu-top-nav";
import { Span } from "@/lib/components/text";
import { clearLog, logError, useLogs } from "@/lib/log";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import packageMeta from "../package.json";

const logHeader = `version ${packageMeta.version}\n`;

export default function () {
  const [t] = useTranslation();
  const logs = useLogs();

  return (
    <>
      <SubMenuTopNav>
        <SubMenuBackButton />

        <SubMenuTitle>{t("Logs")}</SubMenuTitle>

        <SubMenuActions>
          <SubMenuIconButton
            icon={CopyIcon}
            onPress={() =>
              Clipboard.setStringAsync(
                logHeader + "\n" + logs.join("\n")
              ).catch(logError)
            }
          />
          <SubMenuIconButton icon={TrashIcon} onPress={clearLog} />
        </SubMenuActions>
      </SubMenuTopNav>

      <ScrollView contentContainerStyle={styles.logs}>
        <Span>{logHeader}</Span>

        {logs.map((s, i) => (
          <Span key={i}>{s}</Span>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  logs: {
    paddingHorizontal: 8,
  },
});
