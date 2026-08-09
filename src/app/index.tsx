import React, { useMemo, useState } from "react";
import { useTheme } from "@/src/lib/contexts/theme";
import TopNav from "@/src/lib/components/top-nav";
import TopNavDictionaryStack from "@/src/lib/components/top-nav-dictionary-stack";
import { BottomNav, BottomNavItem } from "@/src/lib/components/bottom-nav";
import { useUserDataSignal } from "@/src/lib/contexts/user-data";
import { UserData } from "@/src/lib/data";
import { useSignalLens } from "@/src/lib/hooks/use-signal";
import { NavigationBarSpacer } from "@/src/lib/components/system-bar-spacers";

import {
  DictionaryIcon,
  StatisticsIcon,
  ScanIcon,
  PracticeIcon,
} from "@/src/lib/components/icons";
import { useTranslation } from "react-i18next";

import Dictionary from "@/src/lib/components/pseudo-pages/dictionary";
import Read from "@/src/lib/components/pseudo-pages/read";
import Practice from "@/src/lib/components/pseudo-pages/practice";
import Statistics from "@/src/lib/components/pseudo-pages/statistics";
import RouteRoot from "@/src/lib/components/route-root";
import Carousel from "@/src/lib/components/carousel";
import Tutorial from "@/src/lib/components/tutorial";

export const pages = [
  { label: "Read", iconComponent: ScanIcon, component: Read },
  { label: "Dictionary", iconComponent: DictionaryIcon, component: Dictionary },
  { label: "Practice", iconComponent: PracticeIcon, component: Practice },
  { label: "Statistics", iconComponent: StatisticsIcon, component: Statistics },
];

export default function () {
  const userDataSignal = useUserDataSignal();
  const completedTutoral = useSignalLens(
    userDataSignal,
    (data: UserData) => data.completedTutorial,
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const index = pages.findIndex((p) => p.label == userDataSignal.get().home);

    if (index == -1) {
      return 1;
    }

    return index;
  });
  const theme = useTheme();
  const [t] = useTranslation();

  // eslint-disable-next-line react/jsx-key
  const pageElements = useMemo(() => pages.map((p) => <p.component />), []);

  return (
    <RouteRoot
      pointerEvents={completedTutoral ? undefined : "none"}
      allowNavigationInset
    >
      <TopNav>
        <TopNavDictionaryStack />
      </TopNav>

      <Carousel pageIndex={currentPage} pageElements={pageElements} />

      <BottomNav>
        {pages.map((page, i) => (
          <BottomNavItem
            key={i}
            active={i == currentPage}
            label={t(page.label)}
            iconComponent={page.iconComponent}
            theme={theme}
            onPress={() => setCurrentPage(i)}
          />
        ))}
      </BottomNav>

      <NavigationBarSpacer
        style={{ backgroundColor: theme.colors.bottomNav }}
      />

      {!completedTutoral && <Tutorial setCurrentPage={setCurrentPage} />}
    </RouteRoot>
  );
}
