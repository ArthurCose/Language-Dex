import { useColorScheme as useSystemColorTheme } from "react-native";
import { useUserDataContext } from "./user-data";

export function useColorScheme(): "light" | "dark" {
  return (
    useUserDataContext()[0].colorScheme || useSystemColorTheme() || "light"
  );
}
