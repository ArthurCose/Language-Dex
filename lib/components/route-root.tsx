import React from "react";
import { StyleProp, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardSpacer from "./keyboard-spacer";

type RouteRootProps = {
  style?: StyleProp<ViewProps>;
} & React.PropsWithChildren;

export default function RouteRoot({ style, children }: RouteRootProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[style, { flex: 1 }]}>
      <View style={{ height: insets.top }} />

      {children}

      <KeyboardSpacer />
    </View>
  );
}
