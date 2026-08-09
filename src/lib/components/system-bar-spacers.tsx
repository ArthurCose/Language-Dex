import { View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/theme";

export function StatusBarSpacer() {
  const insets = useSafeAreaInsets();

  return <View style={{ height: insets.top }} />;
}

export function NavigationBarSpacer({ style }: { style?: ViewStyle }) {
  const insets = useSafeAreaInsets();

  return <View style={[{ height: insets.bottom }, style]} />;
}

export function NavigationBarUnderlay({ style }: { style?: ViewStyle }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View style={{ height: 0 }}>
      <View
        style={[
          {
            backgroundColor: theme.colors.bottomNav,
            top: -insets.bottom,
            height: insets.bottom,
            opacity: 0.5,
            zIndex: 5,
          },
          style,
        ]}
      />
    </View>
  );
}
