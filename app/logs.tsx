import { SubMenuIconButton } from "@/lib/components/icon-button";
import { CopyIcon, ShareIcon, TrashIcon } from "@/lib/components/icons";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
  SubMenuTitle,
} from "@/lib/components/sub-menu-top-nav";
import { Span } from "@/lib/components/text";
import { clearLog, logError, useLogs } from "@/lib/log";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Share, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import packageMeta from "../package.json";
import RouteRoot from "@/lib/components/route-root";

const logHeader = `version ${packageMeta.version}\n`;

export default function () {
  const [t] = useTranslation();
  const logs = useLogs();

  return (
    <RouteRoot>
      <SubMenuTopNav>
        <SubMenuBackButton />

        <SubMenuTitle>{t("Logs")}</SubMenuTitle>

        <SubMenuActions>
          <SubMenuIconButton icon={TrashIcon} onPress={clearLog} />

          <SubMenuIconButton
            icon={CopyIcon}
            onPress={() =>
              Clipboard.setStringAsync(
                logHeader + "\n" + logs.join("\n")
              ).catch(logError)
            }
          />

          <SubMenuIconButton
            icon={ShareIcon}
            onPress={() =>
              Share.share({
                message: logHeader + "\n" + logs.join("\n"),
              }).catch(logError)
            }
          />
        </SubMenuActions>
      </SubMenuTopNav>

      <ScrollView contentContainerStyle={styles.logs}>
        <Span>{logHeader}</Span>

        {logs.map((s, i) => (
          <Span key={i}>{s}</Span>
        ))}
      </ScrollView>
    </RouteRoot>
  );
}

const styles = StyleSheet.create({
  logs: {
    paddingHorizontal: 8,
  },
});
