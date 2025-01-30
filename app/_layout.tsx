import React, { useEffect, useMemo, useState } from "react";
import { useColorScheme as useSystemColorScheme, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeContext } from "@/lib/contexts/theme";
import { themeList, themeConstructors } from "@/lib/themes";
import { loadUserData, saveUserData, UserData } from "@/lib/data";
import { UserDataContext } from "@/lib/contexts/user-data";
import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";

import "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { logError } from "@/lib/log";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import KeyboardDismisser from "@/lib/components/keyboard-dismisser";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(logError);

export default function RootLayout() {
  const [userData, setUserData] = useState<UserData | undefined>();
  const systemColorScheme = useSystemColorScheme();
  const colorScheme = userData?.colorScheme || systemColorScheme || "light";
  const [t] = useTranslation();

  // derive theme from user data and color scheme
  const theme = useMemo(() => {
    const themeName = userData?.theme ?? themeList[0];
    const themeConstructor =
      themeConstructors[themeName] ?? themeConstructors[themeList[0]];

    return themeConstructor(colorScheme);
  }, [userData?.theme, colorScheme]);

  // load user data
  useEffect(() => {
    loadUserData(t)
      .then((data) => setUserData(data))
      .catch(logError);
  }, []);

  // hide splash screen and render if we're fully loaded
  const loading = !userData;

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(logError);
    }
  }, [loading]);

  if (loading) {
    return <></>;
  }

  return (
    <ThemeContext.Provider value={theme}>
      <UserDataContext.Provider
        value={[
          userData,
          (setStateAction) => {
            if (typeof setStateAction == "function") {
              setUserData((d) => {
                const data = setStateAction(d!);
                saveUserData(data).catch(logError);
                return data;
              });
            } else {
              saveUserData(setStateAction).catch(logError);
              setUserData(setStateAction);
            }
          },
        ]}
      >
        <GestureHandlerRootView style={theme.styles.root}>
          <StatusBar translucent={false} />

          <BottomSheetModalProvider>
            <KeyboardDismisser>
              <Stack
                screenOptions={{
                  navigationBarColor:
                    typeof theme.colors.bottomNav == "string"
                      ? theme.colors.bottomNav
                      : undefined,
                  statusBarBackgroundColor:
                    typeof theme.colors.body == "string"
                      ? theme.colors.body
                      : undefined,
                  statusBarStyle: colorScheme == "light" ? "dark" : "light",
                  headerShown: false,
                  contentStyle: theme.styles.root,
                  animation: "fade",
                }}
              />

              <PortalHost />
            </KeyboardDismisser>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </UserDataContext.Provider>
    </ThemeContext.Provider>
  );
}
