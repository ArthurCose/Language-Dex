import React from "react";
import { useTheme } from "../contexts/theme";
import {
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
  BackHandler,
  TextStyle,
} from "react-native";
import { ArrowLeftIcon } from "./icons";
import { router } from "expo-router";
import { SubMenuIconButton } from "./icon-button";
import { Span } from "./text";

type Props = { style?: StyleProp<ViewStyle> } & React.PropsWithChildren;

export default function SubMenuTopNav({ style, children }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.header, theme.styles.subMenuTopNav, style]}>
      {children}
    </View>
  );
}

export function SubMenuTitle({
  style,
  children,
}: { style?: StyleProp<TextStyle> } & React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <Span style={[styles.title, theme.styles.subMenuTitle, style]}>
      {children}
    </Span>
  );
}

export function SubMenuActions({ style, children }: Props) {
  return <View style={[styles.actions, style]}>{children}</View>;
}

export function SubMenuBackButton() {
  return (
    <SubMenuIconButton
      icon={ArrowLeftIcon}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          BackHandler.exitApp();
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  title: {
    marginLeft: 8,
    fontSize: 22,
    alignSelf: "center",
  },
  actions: {
    marginLeft: "auto",
    display: "flex",
    flexDirection: "row",
  },
});
