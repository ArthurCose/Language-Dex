import React from "react";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import KeyboardDismisser from "./keyboard-dismisser";
import { useTheme } from "@/lib/contexts/theme";
import { StyleProp, View, ViewStyle } from "react-native";

type Props = { style?: StyleProp<ViewStyle> } & React.PropsWithChildren;

export default function RouteRoot({ children, style }: Props) {
  const theme = useTheme();

  return (
    <BottomSheetModalProvider>
      <KeyboardDismisser>
        <View style={[theme.styles.root, style]}>{children}</View>
      </KeyboardDismisser>
    </BottomSheetModalProvider>
  );
}
