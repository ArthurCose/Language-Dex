import { ScrollView, Share, StyleSheet } from "react-native";
import { SubMenuIconButton } from "./icon-button";
import { CopyIcon, ShareIcon, TrashIcon } from "./icons";
import * as Clipboard from "expo-clipboard";
import { clearLog, logError, logs, useLogs } from "@/lib/log";
import appMeta from "@/app.json";
import { Span } from "./text";
import { useTranslation } from "react-i18next";
import { NavigationBarSpacer } from "./system-bar-spacers";

const versionHeader = `Version ${appMeta.expo.version}\n`;

export function ClearLogsButton() {
  return <SubMenuIconButton icon={TrashIcon} onPress={clearLog} />;
}

export function ShareLogsButton() {
  return (
    <SubMenuIconButton
      icon={ShareIcon}
      onPress={() =>
        Share.share({
          message: versionHeader + "\n" + logs.join("\n"),
        }).catch(logError)
      }
    />
  );
}

export function CopyLogsButton() {
  return (
    <SubMenuIconButton
      icon={CopyIcon}
      onPress={() =>
        Clipboard.setStringAsync(versionHeader + "\n" + logs.join("\n")).catch(
          logError
        )
      }
    />
  );
}

export function LogsView() {
  const logs = useLogs();
  const [t] = useTranslation();

  return (
    <ScrollView contentContainerStyle={styles.logs}>
      <Span>{t("log_header") + "\n\n" + versionHeader}</Span>

      {logs.map((s, i) => (
        <Span key={i}>{s}</Span>
      ))}

      <NavigationBarSpacer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  logs: {
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
});
