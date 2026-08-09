import React, { useEffect } from "react";
import {
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardSpacer from "./keyboard-spacer";
import { ErrorBoundaryProps, Try } from "expo-router/build/views/Try";
import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
  SubMenuTitle,
} from "./sub-menu-top-nav";
import { CopyLogsButton, LogsView, ShareLogsButton } from "./logs-components";
import { logError } from "@/src/lib/log";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/theme";

type RouteRootProps = {
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps["pointerEvents"];
  allowNavigationInset?: boolean;
} & React.PropsWithChildren;

export default function RouteRoot({
  style,
  children,
  pointerEvents,
  allowNavigationInset,
}: RouteRootProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View style={[theme.styles.root, style]} pointerEvents={pointerEvents}>
      <View style={{ height: insets.top }} />

      <Try catch={ErrorBoundary}>{children}</Try>

      <KeyboardSpacer />
      {!allowNavigationInset && <View style={{ height: insets.bottom }} />}
    </View>
  );
}

function ErrorBoundary({ error }: ErrorBoundaryProps) {
  const [t] = useTranslation();

  useEffect(() => {
    logError(error);
  }, [error]);

  return (
    <>
      <SubMenuTopNav>
        <SubMenuBackButton />

        <SubMenuActions>
          <CopyLogsButton />
          <ShareLogsButton />
        </SubMenuActions>
      </SubMenuTopNav>

      <SubMenuTitle style={styles.errorTitle}>
        {t("something_went_wrong")}
      </SubMenuTitle>

      <LogsView />
    </>
  );
}

const styles = StyleSheet.create({
  errorTitle: { marginBottom: 8 },
});
