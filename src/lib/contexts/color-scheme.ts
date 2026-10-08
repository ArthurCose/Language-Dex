import { useColorScheme as useSystemColorTheme } from "react-native";
import { useUserDataSignal } from "./user-data-context";
import { Signal, useSignalLens } from "../hooks/use-signal";
import { UserData } from "../data";

export function useColorSchemeWithUserDataSignal(
  userDataSignal: Signal<UserData | undefined>,
): "light" | "dark" {
  const userDataColorScheme = useSignalLens(
    userDataSignal,
    (data) => data?.colorScheme,
  );
  const systemColorScheme = useSystemColorTheme();

  if (userDataColorScheme != null) {
    return userDataColorScheme;
  }

  if (systemColorScheme != "unspecified") {
    return systemColorScheme;
  }

  return "light";
}

export function useColorScheme(): "light" | "dark" {
  return useColorSchemeWithUserDataSignal(
    useUserDataSignal() as Signal<UserData | undefined>,
  );
}
