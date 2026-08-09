import { Stack } from "expo-router";
import { useTheme } from "@/src/lib/contexts/theme";
import RouteRoot from "@/src/lib/components/route-root";

export default function () {
  const theme = useTheme();

  return (
    <RouteRoot style={theme.styles.wordsRoot}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: theme.styles.wordsRoot,
          animation: "fade",
        }}
      />
    </RouteRoot>
  );
}
