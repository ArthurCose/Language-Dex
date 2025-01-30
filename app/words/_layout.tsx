import { useTheme } from "@/lib/contexts/theme";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function () {
  const theme = useTheme();

  return (
    <View style={theme.styles.wordsRoot}>
      <Stack
        screenOptions={{
          navigationBarColor:
            typeof theme.colors.definitionBackground == "string"
              ? theme.colors.definitionBackground
              : undefined,
          statusBarBackgroundColor:
            typeof theme.colors.definitionBackground == "string"
              ? theme.colors.definitionBackground
              : undefined,
          headerShown: false,
          contentStyle: theme.styles.wordsRoot,
          animation: "fade",
        }}
      />
    </View>
  );
}
