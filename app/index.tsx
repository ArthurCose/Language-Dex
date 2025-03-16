import React, { useMemo, useState } from "react";
import { useTheme } from "@/lib/contexts/theme";
import TopNav from "@/lib/components/top-nav";
import TopNavDictionaryStack from "@/lib/components/top-nav-dictionary-stack";
import { BottomNav, BottomNavItem } from "@/lib/components/bottom-nav";
import {
  DictionaryIcon,
  StatisticsIcon,
  ScanIcon,
  PracticeIcon,
} from "@/lib/components/icons";
import { useTranslation } from "react-i18next";

import Dictionary from "@/lib/components/pseudo-pages/dictionary";
import Read from "@/lib/components/pseudo-pages/read";
import Practice from "@/lib/components/pseudo-pages/practice";
import Statistics from "@/lib/components/pseudo-pages/statistics";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import RouteRoot from "@/lib/components/route-root";
import Carousel from "@/lib/components/carousel";

export const pages = [
  { label: "Read", iconComponent: ScanIcon, component: Read },
  { label: "Dictionary", iconComponent: DictionaryIcon, component: Dictionary },
  { label: "Practice", iconComponent: PracticeIcon, component: Practice },
  { label: "Statistics", iconComponent: StatisticsIcon, component: Statistics },
];

export default function () {
  const userDataSignal = useUserDataSignal();
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
    <RouteRoot>
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
    </RouteRoot>
  );
}
