import React, { useEffect, useMemo } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeContext } from "@/lib/contexts/theme";
import { themeList, themeConstructors } from "@/lib/themes";
import { loadUserData, saveUserData, UserData } from "@/lib/data";
import { UserDataContext } from "@/lib/contexts/user-data";
import { Stack, usePathname } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { clearLog, log, logError } from "@/lib/log";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import KeyboardDismisser from "@/lib/components/keyboard-dismisser";

import "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { initInAppPurchases } from "@/lib/in-app-purchases";
import { initAds } from "@/lib/components/ads";
import { Signal, useSignal, useSignalLens } from "@/lib/hooks/use-signal";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(logError);

const startTime = performance.now();

function PathLogger() {
  const pathName = usePathname();

  useEffect(() => {
    log(`Viewing ${pathName}`);
  }, [pathName]);

  return null;
}

export default function RootLayout() {
  const userDataSignal = useSignal<UserData | undefined>(undefined);
  const systemColorScheme = useSystemColorScheme();
  const userDataTheme = useSignalLens(userDataSignal, (data) => data?.theme);
  const userDataColorScheme = useSignalLens(
    userDataSignal,
    (data) => data?.colorScheme
  );

  const colorScheme = userDataColorScheme || systemColorScheme || "light";
  const [t] = useTranslation();

  // derive theme from user data and color scheme
  const theme = useMemo(() => {
    const themeName = userDataTheme ?? themeList[0];
    const themeConstructor =
      themeConstructors[themeName] ?? themeConstructors[themeList[0]];

    return themeConstructor(colorScheme);
  }, [userDataTheme, colorScheme]);

  // load user data
  useEffect(() => {
    // reloaded app?
    clearLog();

    loadUserData(t)
      .then((data) => {
        userDataSignal.set(data);
        userDataSignal.subscribe((data) => saveUserData(data!).catch(logError));

        initAds(data);
        initInAppPurchases(userDataSignal as Signal<UserData>);
      })
      .catch(logError);
  }, []);

  // hide splash screen and render if we're fully loaded
  const loading = useSignalLens(userDataSignal, (data) => !data);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(logError);
      log(`App initialized in ${performance.now() - startTime}ms`);
    }
  }, [loading]);

  if (loading) {
    return <></>;
  }

  return (
    <ThemeContext.Provider value={theme}>
      <UserDataContext.Provider value={userDataSignal as Signal<UserData>}>
        <GestureHandlerRootView style={theme.styles.root}>
          <BottomSheetModalProvider>
            <KeyboardDismisser>
              <Stack
                screenOptions={{
                  navigationBarColor:
                    typeof theme.colors.bottomNav == "string"
                      ? theme.colors.bottomNav
                      : undefined,
                  statusBarBackgroundColor: "transparent",
                  statusBarStyle: colorScheme == "light" ? "dark" : "light",
                  statusBarTranslucent: true,
                  headerShown: false,
                  contentStyle: theme.styles.root,
                  animation: "fade",
                }}
              />

              <PathLogger />

              <PortalHost />
            </KeyboardDismisser>
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </UserDataContext.Provider>
    </ThemeContext.Provider>
  );
}
