import { StyleProp, View, ViewStyle } from "react-native";
import { useTheme } from "@/src/lib/contexts/theme";
import React from "react";

type PropsWithStyleAndChildren = {
  style?: StyleProp<ViewStyle>;
} & React.PropsWithChildren;

export default function ({ style, children }: PropsWithStyleAndChildren) {
  const theme = useTheme();

  return <View style={[theme.styles.topNav, style]}>{children}</View>;
}
