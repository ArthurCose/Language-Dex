import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
  SubMenuTitle,
} from "@/src/lib/components/sub-menu-top-nav";
import React from "react";
import { useTranslation } from "react-i18next";
import RouteRoot from "@/src/lib/components/route-root";
import {
  CopyLogsButton,
  LogsView,
  ShareLogsButton,
} from "@/src/lib/components/logs-components";
import { NavigationBarUnderlay } from "@/src/lib/components/system-bar-spacers";

export default function () {
  const [t] = useTranslation();

  return (
    <RouteRoot allowNavigationInset>
      <SubMenuTopNav>
        <SubMenuBackButton />

        <SubMenuTitle>{t("Logs")}</SubMenuTitle>

        <SubMenuActions>
          <CopyLogsButton />
          <ShareLogsButton />
        </SubMenuActions>
      </SubMenuTopNav>

      <LogsView />
      <NavigationBarUnderlay />
    </RouteRoot>
  );
}
