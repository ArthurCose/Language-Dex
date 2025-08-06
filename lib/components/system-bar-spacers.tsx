import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function StatusBarSpacer() {
  const insets = useSafeAreaInsets();

  return <View style={{ height: insets.top }} />;
}

export function NavigationBarSpacer() {
  const insets = useSafeAreaInsets();

  return <View style={{ height: insets.bottom }} />;
}
