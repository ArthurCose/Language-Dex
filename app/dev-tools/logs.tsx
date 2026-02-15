import SubMenuTopNav, {
  SubMenuActions,
  SubMenuBackButton,
  SubMenuTitle,
} from "@/lib/components/sub-menu-top-nav";
import React from "react";
import { useTranslation } from "react-i18next";
import RouteRoot from "@/lib/components/route-root";
import {
  CopyLogsButton,
  LogsView,
  ShareLogsButton,
} from "@/lib/components/logs-components";
import { NavigationBarUnderlay } from "@/lib/components/system-bar-spacers";

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
