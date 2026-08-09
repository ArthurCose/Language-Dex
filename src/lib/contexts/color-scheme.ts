import { useColorScheme as useSystemColorTheme } from "react-native";
import { useUserDataSignal } from "./user-data";
import { useSignalLens } from "../hooks/use-signal";

export function useColorScheme(): "light" | "dark" {
  const userDataColorScheme = useSignalLens(
    useUserDataSignal(),
    (data) => data.colorScheme
  );
  const systemColorScheme = useSystemColorTheme();

  return userDataColorScheme || systemColorScheme || "light";
}
