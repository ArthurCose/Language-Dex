import React from "react";
import { useTheme } from "../contexts/theme";
import { StyleSheet, StyleProp, View, ViewStyle } from "react-native";

type Props = { style?: StyleProp<ViewStyle> } & React.PropsWithChildren;

export default function SubMenuTopNav({ style, children }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.header, theme.styles.subMenuTopNav, style]}>
      {children}
    </View>
  );
}

export function SubMenuActions({ style, children }: Props) {
  return <View style={[styles.actions, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  actions: {
    display: "flex",
    flexDirection: "row",
  },
});
